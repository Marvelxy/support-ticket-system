import { prisma } from '../db.js';
import type { AuthUser } from '../middleware/auth.js';
import { getAiProvider, slaDueAt } from './ai/factory.js';
import type { ClassifyResult } from './ai/types.js';
import { HttpError } from './errors.js';

export { HttpError };

export interface TicketListQuery {
  q?: string;
  status?: string;
  priority?: string;
  category?: string;
  page?: string;
  limit?: string;
  mine?: string;
  needsReview?: string;
  sort?: string;
}

export interface CreateTicketInput {
  title: string;
  body: string;
  assigneeId?: string;
}

export interface UpdateTicketInput {
  status?: string;
  priority?: string;
  assigneeId?: string | null;
}

export interface ReviewTicketInput {
  category?: string;
  priority?: string;
}

const VALID_CATEGORIES = ['billing', 'technical', 'account', 'feature_request', 'general'];
const VALID_PRIORITIES = ['critical', 'high', 'medium', 'low'];

export interface AddCommentInput {
  body: string;
  internal?: boolean;
}

function assertCanAccess(user: AuthUser, ticket: { createdById: string }) {
  if (user.role === 'customer' && ticket.createdById !== user.id) {
    throw new HttpError(403, 'Forbidden');
  }
}

// Shared by auto-triage (on create) and manual re-triage
async function applyClassification(ticketId: string, r: ClassifyResult, detail: string) {
  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      category: r.category,
      priority: r.priority,
      confidence: r.confidence,
      summary: r.summary,
      slaDueAt: slaDueAt(r.priority),
      needsReview: r.confidence < 0.7,
    },
  });
  await prisma.auditLog.create({
    data: { ticketId, actor: `ai:${r.provider}`, action: 'classified', detail },
  });
  return updated;
}

export const ticketService = {
  // List with search/filter/pagination - what recruiters check
  async list(user: AuthUser, query: TicketListQuery) {
    const {
      q,
      status,
      priority,
      category,
      page = '1',
      limit = '20',
      mine,
      needsReview,
      sort = 'newest',
    } = query;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (needsReview === 'true') where.needsReview = true;
    if (mine === 'true') where.createdById = user.id;
    // Customers only see own tickets; agents/admin see all
    if (user.role === 'customer') where.createdById = user.id;
    if (q?.trim()) {
      const needle = q.trim();
      (where as Record<string, unknown>).OR = [
        { title: { contains: needle } },
        { body: { contains: needle } },
      ];
    }
    const orderBy =
      sort === 'oldest'
        ? { createdAt: 'asc' as const }
        : sort === 'priority'
          ? [{ priority: 'asc' as const }, { createdAt: 'desc' as const }]
          : sort === 'sla'
            ? { slaDueAt: 'asc' as const }
            : { createdAt: 'desc' as const };
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, parseInt(limit, 10) || 20);
    const [total, tickets] = await Promise.all([
      prisma.ticket.count({ where: where as never }),
      prisma.ticket.findMany({
        where: where as never,
        orderBy: orderBy as never,
        skip: (p - 1) * l,
        take: l,
        include: {
          createdBy: { select: { name: true, email: true } },
          assignee: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);
    return { total, page: p, limit: l, tickets };
  },

  async create(user: AuthUser, input: CreateTicketInput) {
    const ticket = await prisma.ticket.create({ data: { ...input, createdById: user.id } });
    await prisma.auditLog.create({
      data: { ticketId: ticket.id, actor: user.email, action: 'created' },
    });
    // Auto-triage async (non-blocking) - in prod move to BullMQ + Redis
    getAiProvider()
      .classify(ticket.title, ticket.body)
      .then(async (r) => {
        await applyClassification(
          ticket.id,
          r,
          `${r.category}/${r.priority} conf=${r.confidence.toFixed(2)}`,
        );
      })
      .catch(() => {});
    return ticket;
  },

  async getById(user: AuthUser, id: string) {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        comments: {
          include: { author: { select: { name: true } } },
          orderBy: { createdAt: 'asc' },
        },
        audits: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!ticket) throw new HttpError(404, 'Not found');
    assertCanAccess(user, ticket);
    return ticket;
  },

  async update(user: AuthUser, id: string, input: UpdateTicketInput) {
    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new HttpError(404, 'Not found');
    assertCanAccess(user, ticket);
    const { status, priority, assigneeId } = input;
    if (status !== undefined && !['open', 'pending', 'resolved', 'closed'].includes(status))
      throw new HttpError(400, `Invalid status: ${status}`);
    if (priority !== undefined && !VALID_PRIORITIES.includes(priority))
      throw new HttpError(400, `Invalid priority: ${priority}`);
    if (assigneeId) {
      const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
      if (!assignee) throw new HttpError(404, 'Assignee not found');
      if (!['admin', 'agent'].includes(assignee.role))
        throw new HttpError(400, 'Assignee must be an agent or admin');
    }
    const updated = await prisma.ticket.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(priority && { priority, slaDueAt: slaDueAt(priority) }),
        ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
      },
    });
    await prisma.auditLog.create({
      data: {
        ticketId: updated.id,
        actor: user.email,
        action: assigneeId !== undefined ? 'assigned' : 'updated',
        detail: JSON.stringify({ status, priority, assigneeId: updated.assigneeId }),
      },
    });
    return updated;
  },

  async addComment(user: AuthUser, ticketId: string, input: AddCommentInput) {
    if (!input.body?.trim()) throw new HttpError(400, 'Empty comment');
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new HttpError(404, 'Not found');
    return prisma.comment.create({
      data: {
        ticketId,
        authorId: user.id,
        body: input.body,
        internal: input.internal === true && user.role !== 'customer',
      },
    });
  },

  // Manual re-triage (agent/admin or owner)
  async classify(user: AuthUser, id: string) {
    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new HttpError(404, 'Not found');
    assertCanAccess(user, ticket);
    const r = await getAiProvider().classify(ticket.title, ticket.body);
    const updated = await applyClassification(ticket.id, r, r.summary);
    return { ticket: updated, suggestedReply: r.suggestedReply, provider: r.provider };
  },

  // Human review: correct AI triage and clear the needsReview flag
  async review(user: AuthUser, id: string, input: ReviewTicketInput) {
    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new HttpError(404, 'Not found');
    assertCanAccess(user, ticket);
    const { category, priority } = input;
    if (category !== undefined && !VALID_CATEGORIES.includes(category))
      throw new HttpError(400, `Invalid category: ${category}`);
    if (priority !== undefined && !VALID_PRIORITIES.includes(priority))
      throw new HttpError(400, `Invalid priority: ${priority}`);
    const updated = await prisma.ticket.update({
      where: { id },
      data: {
        ...(category !== undefined && { category }),
        ...(priority !== undefined && { priority, slaDueAt: slaDueAt(priority) }),
        needsReview: false,
      },
    });
    await prisma.auditLog.create({
      data: {
        ticketId: updated.id,
        actor: user.email,
        action: 'reviewed',
        detail: JSON.stringify({ category: updated.category, priority: updated.priority }),
      },
    });
    return updated;
  },
};

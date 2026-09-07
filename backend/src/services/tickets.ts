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
}

export interface CreateTicketInput {
  title: string;
  body: string;
  assigneeId?: string;
}

export interface UpdateTicketInput {
  status?: string;
  priority?: string;
  assigneeId?: string;
}

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
    const { q, status, priority, category, page = '1', limit = '20', mine } = query;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (mine === 'true') where.createdById = user.id;
    // Customers only see own tickets; agents/admin see all
    if (user.role === 'customer') where.createdById = user.id;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, parseInt(limit, 10) || 20);
    const [total, tickets] = await Promise.all([
      prisma.ticket.count({ where: where as never }),
      prisma.ticket.findMany({
        where: where as never,
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * l,
        take: l,
        include: { createdBy: { select: { name: true, email: true } } },
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
        action: 'updated',
        detail: JSON.stringify({ status, priority }),
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
};

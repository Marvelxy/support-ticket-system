import { Router } from 'express';
import { z } from 'zod';
import { auth, requireRole } from '../middleware/auth.js';
import { ah } from '../middleware/asyncHandler.js';
import { ticketService } from '../services/tickets.js';
import type { TicketListQuery } from '../services/tickets.js';
import { emit } from '../realtime.js';

const router = Router();
router.use(auth);

const createSchema = z.object({
  title: z.string().min(3),
  body: z.string().min(5),
  assigneeId: z.string().optional(),
});

const reviewSchema = z.object({
  category: z.enum(['billing', 'technical', 'account', 'feature_request', 'general']).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
});

const updateSchema = z.object({
  status: z.enum(['open', 'pending', 'resolved', 'closed']).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  assigneeId: z.string().nullable().optional(),
});

// List with search/filter/pagination - what recruiters check
router.get(
  '/',
  ah(async (req, res) => {
    res.json(await ticketService.list(req.user!, req.query as unknown as TicketListQuery));
  }),
);

router.post(
  '/',
  ah(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const ticket = await ticketService.create(req.user!, parsed.data);
    emit('ticket:created', { id: (ticket as { id: string }).id });
    res.status(201).json(ticket);
  }),
);

router.get(
  '/:id',
  ah(async (req, res) => {
    res.json(await ticketService.getById(req.user!, req.params.id));
  }),
);

// Human review: correct AI triage and clear needsReview (agent/admin only)
router.patch(
  '/:id/review',
  requireRole('admin', 'agent'),
  ah(async (req, res) => {
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const ticket = await ticketService.review(req.user!, req.params.id, parsed.data);
    emit('ticket:updated', { id: req.params.id });
    res.json(ticket);
  }),
);

router.patch(
  '/:id',
  ah(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const ticket = await ticketService.update(req.user!, req.params.id, parsed.data);
    emit('ticket:updated', { id: req.params.id });
    res.json(ticket);
  }),
);

router.post(
  '/:id/comments',
  ah(async (req, res) => {
    const comment = await ticketService.addComment(req.user!, req.params.id, req.body);
    emit('comment:added', { ticketId: req.params.id });
    res.status(201).json(comment);
  }),
);

// Manual re-triage (agent/admin or owner)
router.post(
  '/:id/classify',
  ah(async (req, res) => {
    const result = await ticketService.classify(req.user!, req.params.id);
    emit('ticket:updated', { id: req.params.id });
    res.json(result);
  }),
);

export default router;

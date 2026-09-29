import { Router } from 'express';
import { z } from 'zod';
import { auth, requireRole } from '../middleware/auth.js';
import { ah } from '../middleware/asyncHandler.js';
import { ticketService } from '../services/tickets.js';
import type { TicketListQuery } from '../services/tickets.js';

const router = Router();
router.use(auth);

const createSchema = z.object({
  title: z.string().min(3),
  body: z.string().min(5),
  assigneeId: z.string().optional(),
});

const reviewSchema = z.object({
  category: z
    .enum(['billing', 'technical', 'account', 'feature_request', 'general'])
    .optional(),
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
    res.status(201).json(await ticketService.create(req.user!, parsed.data));
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
    res.json(await ticketService.review(req.user!, req.params.id, parsed.data));
  }),
);

router.patch(
  '/:id',
  ah(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    res.json(await ticketService.update(req.user!, req.params.id, parsed.data));
  }),
);

router.post(
  '/:id/comments',
  ah(async (req, res) => {
    res.status(201).json(await ticketService.addComment(req.user!, req.params.id, req.body));
  }),
);

// Manual re-triage (agent/admin or owner)
router.post(
  '/:id/classify',
  ah(async (req, res) => {
    res.json(await ticketService.classify(req.user!, req.params.id));
  }),
);

export default router;

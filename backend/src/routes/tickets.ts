import { Router } from 'express';
import { z } from 'zod';
import { auth } from '../middleware/auth.js';
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

router.patch(
  '/:id',
  ah(async (req, res) => {
    res.json(await ticketService.update(req.user!, req.params.id, req.body));
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

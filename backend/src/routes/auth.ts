import { Router } from 'express';
import { z } from 'zod';
import { auth, requireRole } from '../middleware/auth.js';
import { ah } from '../middleware/asyncHandler.js';
import { authService } from '../services/auth.js';

const router = Router();
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['admin', 'agent', 'customer']).optional(),
});

router.post(
  '/register',
  ah(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    res.json(await authService.register(parsed.data));
  }),
);

router.post(
  '/login',
  ah(async (req, res) => {
    const { email, password } = req.body as { email: string; password: string };
    res.json(await authService.login(email, password));
  }),
);

router.get(
  '/me',
  auth,
  ah(async (req, res) => {
    res.json(await authService.me(req.user!.id));
  }),
);

// Assignable users for the ticket assignee picker (agent/admin only)
router.get(
  '/users',
  auth,
  requireRole('admin', 'agent'),
  ah(async (_req, res) => {
    res.json(await authService.listAssignable());
  }),
);

// Full user list + role management (admin only)
router.get(
  '/admin/users',
  auth,
  requireRole('admin'),
  ah(async (_req, res) => {
    res.json(await authService.listAll());
  }),
);

router.patch(
  '/admin/users/:id',
  auth,
  requireRole('admin'),
  ah(async (req, res) => {
    const parsed = z.object({ role: z.enum(['admin', 'agent', 'customer']) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    if (req.user!.id === req.params.id && parsed.data.role !== 'admin')
      return res.status(400).json({ error: 'You cannot demote yourself' });
    res.json(await authService.setRole(req.params.id, parsed.data.role));
  }),
);

export default router;

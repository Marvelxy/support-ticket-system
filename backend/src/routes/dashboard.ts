import { Router } from 'express';
import { auth, requireRole } from '../middleware/auth.js';
import { ah } from '../middleware/asyncHandler.js';
import { dashboardService } from '../services/dashboard.js';

const router = Router();
router.use(auth, requireRole('admin', 'agent'));

router.get(
  '/stats',
  ah(async (_req, res) => {
    res.json(await dashboardService.stats());
  }),
);

export default router;

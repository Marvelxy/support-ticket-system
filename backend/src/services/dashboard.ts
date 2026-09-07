import { prisma } from '../db.js';

export const dashboardService = {
  async stats() {
    const [open, pending, critical, needsReview, byCategory] = await Promise.all([
      prisma.ticket.count({ where: { status: 'open' } }),
      prisma.ticket.count({ where: { status: 'pending' } }),
      prisma.ticket.count({ where: { priority: 'critical' } }),
      prisma.ticket.count({ where: { needsReview: true } }),
      prisma.ticket.groupBy({ by: ['category'], _count: true }),
    ]);
    return { open, pending, critical, needsReview, byCategory };
  },
};

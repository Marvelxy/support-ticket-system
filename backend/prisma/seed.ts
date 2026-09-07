import bcrypt from 'bcryptjs';
import { prisma } from '../src/db.js';

async function main() {
  const pw = await bcrypt.hash('password123', 10);
  const admin = await prisma.user.upsert({ where: { email: 'admin@demo.io' }, update: {}, create: { email: 'admin@demo.io', name: 'Admin', role: 'admin', passwordHash: pw } });
  const agent = await prisma.user.upsert({ where: { email: 'agent@demo.io' }, update: {}, create: { email: 'agent@demo.io', name: 'Agent', role: 'agent', passwordHash: pw } });
  const customer = await prisma.user.upsert({ where: { email: 'customer@demo.io' }, update: {}, create: { email: 'customer@demo.io', name: 'Customer', role: 'customer', passwordHash: pw } });
  await prisma.ticket.createMany({ data: [
    { title: 'Payment failed at checkout', body: 'Card charged twice, cannot complete order. Blocked.', createdById: customer.id },
    { title: 'How to reset password?', body: 'Question about account recovery steps.', createdById: customer.id },
  ]});
  console.log({ admin: admin.email, agent: agent.email, customer: customer.email, password: 'password123' });
}
main().finally(() => prisma.$disconnect());

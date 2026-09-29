import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { sign } from '../middleware/auth.js';
import { HttpError } from './errors.js';

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'agent' | 'customer';
}

interface StoredUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

function issueToken(user: StoredUser) {
  const token = sign({ id: user.id, email: user.email, role: user.role, name: user.name });
  return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
}

export const authService = {
  async register(input: RegisterInput) {
    const exists = await prisma.user.findUnique({ where: { email: input.email } });
    if (exists) throw new HttpError(409, 'Email taken');
    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        role: input.role || 'customer',
        passwordHash: await bcrypt.hash(input.password, 10),
      },
    });
    return issueToken(user);
  },

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash)))
      throw new HttpError(401, 'Invalid credentials');
    return issueToken(user);
  },

  async me(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    });
  },

  // Assignable users for the ticket assignee picker (agents + admins)
  async listAssignable() {
    return prisma.user.findMany({
      where: { role: { in: ['admin', 'agent'] } },
      select: { id: true, email: true, name: true, role: true },
      orderBy: { name: 'asc' },
    });
  },

  // Full user list for the admin users page
  async listAll() {
    return prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: { select: { tickets: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  async setRole(userId: string, role: 'admin' | 'agent' | 'customer') {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpError(404, 'User not found');
    return prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });
  },
};

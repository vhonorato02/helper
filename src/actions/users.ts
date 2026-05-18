'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { authEvents, comments, ticketHistory, tickets, users } from '@/db/schema';
import { and, asc, count, desc, eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { copy } from '@/lib/copy';
import {
  currentPasswordSchema,
  displayNameSchema,
  passwordSchema,
  userIdSchema,
  usernameSchema,
} from '@/lib/validation';
import { logger } from '@/lib/logger';

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  return session.user;
}

async function requireAdmin() {
  const user = await requireSession();
  if (!user.isAdmin) redirect('/');
  return user;
}

async function getActiveAdminCount() {
  const [result] = await db
    .select({ total: count() })
    .from(users)
    .where(and(eq(users.isAdmin, true), eq(users.isActive, true)));
  return Number(result?.total ?? 0);
}

async function ensureUsernameAvailable(username: string, ignoreUserId?: string) {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  return !existing || existing.id === ignoreUserId;
}

function revalidateUserSurfaces() {
  revalidatePath('/');
  revalidatePath('/tickets');
  revalidatePath('/kanban');
  revalidatePath('/configuracoes');
}

export async function getUsers() {
  // NOTE: we intentionally do NOT select `mustChangePassword`, `lastLoginAt` or
  // `updatedAt` here. Those columns exist in src/db/schema.ts but the
  // production database has not been migrated yet. Selecting them caused 500s
  // on every page that lists users (configurações, tickets, kanban, detalhe).
  // Once `npm run db:push` runs against prod, feel free to add them back.
  return db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      isAdmin: users.isAdmin,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.displayName));
}

const createUserSchema = z.object({
  username: usernameSchema,
  displayName: displayNameSchema,
  password: passwordSchema,
  isAdmin: z.boolean().default(false),
});

export async function createUser(formData: FormData) {
  await requireAdmin();

  const parsed = createUserSchema.safeParse({
    username: formData.get('username'),
    displayName: formData.get('displayName'),
    password: formData.get('password'),
    isAdmin: formData.get('isAdmin') === 'true',
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? copy.validation.invalidData };
  }

  const available = await ensureUsernameAvailable(parsed.data.username);
  if (!available) return { error: copy.validation.usernameExists };

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  // passwordChangedAt / mustChangePassword intentionally omitted —
  // see note on getUsers above. Schema is ready; awaiting db:push.
  await db.insert(users).values({
    username: parsed.data.username,
    displayName: parsed.data.displayName,
    passwordHash,
    isAdmin: parsed.data.isAdmin,
  });

  revalidatePath('/configuracoes');
  return { ok: true };
}

const updateUserSchema = z.object({
  userId: userIdSchema,
  username: usernameSchema,
  displayName: displayNameSchema,
  isAdmin: z.boolean().default(false),
});

export async function updateUser(formData: FormData) {
  const currentUser = await requireAdmin();

  const parsed = updateUserSchema.safeParse({
    userId: formData.get('userId'),
    username: formData.get('username'),
    displayName: formData.get('displayName'),
    isAdmin: formData.get('isAdmin') === 'true',
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? copy.validation.invalidData };
  }

  const [target] = await db.select().from(users).where(eq(users.id, parsed.data.userId)).limit(1);
  if (!target) return { error: copy.validation.invalidUser };

  const available = await ensureUsernameAvailable(parsed.data.username, parsed.data.userId);
  if (!available) return { error: copy.validation.usernameExists };

  if (target.isAdmin && !parsed.data.isAdmin) {
    const activeAdmins = await getActiveAdminCount();
    if (currentUser.id === target.id || (target.isActive && activeAdmins <= 1)) {
      return { error: copy.users.errors.cannotRemoveLastAdmin };
    }
  }

  await db
    .update(users)
    .set({
      username: parsed.data.username,
      displayName: parsed.data.displayName,
      isAdmin: parsed.data.isAdmin,
      updatedAt: new Date(),
    })
    .where(eq(users.id, parsed.data.userId));

  revalidateUserSurfaces();
  return { ok: true };
}

export async function setUserAdmin(userId: string, isAdmin: boolean) {
  const currentUser = await requireAdmin();
  const parsed = userIdSchema.safeParse(userId);
  if (!parsed.success) return { error: copy.validation.invalidData };

  const [target] = await db.select().from(users).where(eq(users.id, parsed.data)).limit(1);
  if (!target) return { error: copy.validation.invalidUser };

  if (!isAdmin && target.isAdmin) {
    const activeAdmins = await getActiveAdminCount();
    if (currentUser.id === target.id || (target.isActive && activeAdmins <= 1)) {
      return { error: copy.users.errors.cannotRemoveLastAdmin };
    }
  }

  await db.update(users).set({ isAdmin, updatedAt: new Date() }).where(eq(users.id, parsed.data));
  revalidateUserSurfaces();
  return { ok: true };
}

export async function toggleUserActive(userId: string) {
  const currentUser = await requireAdmin();
  const parsed = userIdSchema.safeParse(userId);
  if (!parsed.success) return { error: copy.validation.invalidData };
  if (currentUser.id === parsed.data) return { error: copy.users.errors.cannotDeactivateSelf };

  const [user] = await db
    .select({ isActive: users.isActive, isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, parsed.data))
    .limit(1);
  if (!user) return { error: copy.validation.invalidUser };

  if (user.isActive && user.isAdmin) {
    const activeAdmins = await getActiveAdminCount();
    if (activeAdmins <= 1) return { error: copy.users.errors.cannotRemoveLastAdmin };
  }

  await db
    .update(users)
    .set({ isActive: !user.isActive, updatedAt: new Date() })
    .where(eq(users.id, parsed.data));
  revalidateUserSurfaces();
  return { ok: true };
}

export async function deleteUser(userId: string) {
  const currentUser = await requireAdmin();
  const parsed = userIdSchema.safeParse(userId);
  if (!parsed.success) return { error: copy.validation.invalidData };
  if (currentUser.id === parsed.data) return { error: copy.users.errors.cannotDeleteSelf };

  const [target] = await db.select().from(users).where(eq(users.id, parsed.data)).limit(1);
  if (!target) return { error: copy.validation.invalidUser };

  if (target.isAdmin && target.isActive) {
    const activeAdmins = await getActiveAdminCount();
    if (activeAdmins <= 1) return { error: copy.users.errors.cannotRemoveLastAdmin };
  }

  // Neon HTTP driver does not support transactions — use sequential queries.
  // FK constraints (onDelete: 'set null' / 'cascade') would handle cleanup
  // automatically, but we do it explicitly for environments where migrations
  // were applied manually without FK clauses.
  await db.update(tickets).set({ assigneeId: null }).where(eq(tickets.assigneeId, parsed.data));
  await db.update(tickets).set({ authorId: null }).where(eq(tickets.authorId, parsed.data));
  await db.update(comments).set({ authorId: null }).where(eq(comments.authorId, parsed.data));
  await db
    .update(ticketHistory)
    .set({ authorId: null })
    .where(eq(ticketHistory.authorId, parsed.data));
  await db.delete(users).where(eq(users.id, parsed.data));

  revalidateUserSurfaces();
  return { ok: true };
}

const selfPasswordSchema = z.object({
  userId: userIdSchema,
  currentPassword: currentPasswordSchema,
  newPassword: passwordSchema,
});

const adminPasswordSchema = z.object({
  userId: userIdSchema,
  newPassword: passwordSchema,
});

export async function changePassword(formData: FormData) {
  const currentUser = await requireSession();
  const targetId = String(formData.get('userId') ?? '');
  const isSelf = targetId === currentUser.id;

  if (!isSelf && !currentUser.isAdmin) {
    return { error: copy.auth.errors.permissionDenied };
  }

  let userId: string;
  let newPassword: string;
  let currentPassword: string | null = null;

  if (isSelf) {
    const parsed = selfPasswordSchema.safeParse({
      userId: targetId,
      currentPassword: formData.get('currentPassword'),
      newPassword: formData.get('newPassword'),
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? copy.validation.invalidData };
    }
    userId = parsed.data.userId;
    newPassword = parsed.data.newPassword;
    currentPassword = parsed.data.currentPassword;
  } else {
    const parsed = adminPasswordSchema.safeParse({
      userId: targetId,
      newPassword: formData.get('newPassword'),
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? copy.validation.invalidData };
    }
    userId = parsed.data.userId;
    newPassword = parsed.data.newPassword;
  }

  const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!target) return { error: copy.validation.invalidUser };

  if (isSelf && currentPassword !== null) {
    const valid = await bcrypt.compare(currentPassword, target.passwordHash);
    if (!valid) return { error: copy.validation.passwordCurrentInvalid };
    const sameAsBefore = await bcrypt.compare(newPassword, target.passwordHash);
    if (sameAsBefore) return { error: copy.validation.passwordReused };
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await db
    .update(users)
    .set({
      passwordHash: hash,
      passwordChangedAt: new Date(),
      mustChangePassword: false,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  try {
    await db.insert(authEvents).values({
      userId,
      username: target.username,
      type: isSelf ? 'password_changed' : 'admin_reset_password',
      detail: isSelf ? 'self' : `by:${currentUser.id}`,
    });
  } catch (error) {
    logger.warn('auth_event_insert_failed', { error: String(error) });
  }

  revalidatePath('/configuracoes');
  return { ok: true };
}

export async function getTicketHistory(ticketCode: string) {
  const [ticket] = await db
    .select({ id: tickets.id })
    .from(tickets)
    .where(eq(tickets.code, ticketCode))
    .limit(1);
  if (!ticket) return [];

  return db
    .select({
      id: ticketHistory.id,
      field: ticketHistory.field,
      oldValue: ticketHistory.oldValue,
      newValue: ticketHistory.newValue,
      createdAt: ticketHistory.createdAt,
      authorName: users.displayName,
    })
    .from(ticketHistory)
    .leftJoin(users, eq(ticketHistory.authorId, users.id))
    .where(eq(ticketHistory.ticketId, ticket.id))
    .orderBy(desc(ticketHistory.createdAt));
}

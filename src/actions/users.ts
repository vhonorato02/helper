'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { authEvents, comments, ticketHistory, tickets, users } from '@/db/schema';
import { and, asc, count, desc, eq, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { copy } from '@/lib/copy';
import {
  roleDefaultArea,
  USER_ROLE_OPTIONS,
  type Area,
  type UserRole,
} from '@/lib/constants';
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

let userProfileSchemaPromise: Promise<void> | null = null;

async function ensureUserProfileSchema() {
  userProfileSchemaPromise ??= (async () => {
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role text`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS area area`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text`);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS users_area_role_idx
      ON users (area, role) WHERE is_active = true
    `);
  })();
  return userProfileSchemaPromise;
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

export async function getActiveUsersForAssignment() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  await ensureUserProfileSchema();

  return db
    .select({
      id: users.id,
      displayName: users.displayName,
      role: users.role,
      area: users.area,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.isActive, true))
    .orderBy(asc(users.displayName));
}

export async function getUsers() {
  await requireAdmin();
  await ensureUserProfileSchema();
  return db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      area: users.area,
      avatarUrl: users.avatarUrl,
      isAdmin: users.isAdmin,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.displayName));
}

const roleSchema = z
  .enum(USER_ROLE_OPTIONS.map((role) => role.value) as [UserRole, ...UserRole[]])
  .optional()
  .or(z.literal(''));
const areaSchema = z.enum(['TI', 'MKT', 'PF']).optional().or(z.literal(''));
const avatarUrlSchema = z
  .string()
  .trim()
  .max(300)
  .url('Informe uma URL válida para o avatar.')
  .optional()
  .or(z.literal(''));

const createUserSchema = z.object({
  username: usernameSchema,
  displayName: displayNameSchema,
  password: passwordSchema,
  role: roleSchema,
  area: areaSchema,
  avatarUrl: avatarUrlSchema,
  isAdmin: z.boolean().default(false),
});

export async function createUser(formData: FormData) {
  await requireAdmin();
  await ensureUserProfileSchema();

  const parsed = createUserSchema.safeParse({
    username: formData.get('username'),
    displayName: formData.get('displayName'),
    password: formData.get('password'),
    role: formData.get('role') || undefined,
    area: formData.get('area') || undefined,
    avatarUrl: formData.get('avatarUrl') || undefined,
    isAdmin: formData.get('isAdmin') === 'true',
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? copy.validation.invalidData };
  }

  const available = await ensureUsernameAvailable(parsed.data.username);
  if (!available) return { error: copy.validation.usernameExists };

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await db.insert(users).values({
    username: parsed.data.username,
    displayName: parsed.data.displayName,
    role: parsed.data.role || null,
    area: (parsed.data.area || roleDefaultArea(parsed.data.role)) as Area | null,
    avatarUrl: parsed.data.avatarUrl || null,
    passwordHash,
    isAdmin: parsed.data.isAdmin,
    mustChangePassword: true,
  });

  revalidatePath('/configuracoes');
  return { ok: true };
}

const updateUserSchema = z.object({
  userId: userIdSchema,
  username: usernameSchema,
  displayName: displayNameSchema,
  role: roleSchema,
  area: areaSchema,
  avatarUrl: avatarUrlSchema,
  isAdmin: z.boolean().default(false),
});

export async function updateUser(formData: FormData) {
  const currentUser = await requireAdmin();
  await ensureUserProfileSchema();

  const parsed = updateUserSchema.safeParse({
    userId: formData.get('userId'),
    username: formData.get('username'),
    displayName: formData.get('displayName'),
    role: formData.get('role') || undefined,
    area: formData.get('area') || undefined,
    avatarUrl: formData.get('avatarUrl') || undefined,
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
      role: parsed.data.role || null,
      area: (parsed.data.area || roleDefaultArea(parsed.data.role)) as Area | null,
      avatarUrl: parsed.data.avatarUrl || null,
      isAdmin: parsed.data.isAdmin,
      updatedAt: new Date(),
    })
    .where(eq(users.id, parsed.data.userId));

  revalidateUserSurfaces();
  return { ok: true };
}

const ROLE_BY_AREA: Record<Area, UserRole> = {
  TI: 'ti',
  MKT: 'marketing',
  PF: 'por_fora',
};

export async function getDefaultAssigneeForArea(area: Area) {
  await ensureUserProfileSchema();

  const rows = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      role: users.role,
      area: users.area,
      isAdmin: users.isAdmin,
    })
    .from(users)
    .where(eq(users.isActive, true))
    .orderBy(asc(users.displayName));

  const expectedRole = ROLE_BY_AREA[area];
  return (
    rows.find((user) => user.area === area && user.role === expectedRole) ??
    rows.find((user) => user.area === area) ??
    rows.find((user) => user.role === expectedRole) ??
    null
  );
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

  // Neon HTTP driver does not support transactions, so use sequential queries.
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
      mustChangePassword: isSelf ? false : true,
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
  await requireSession();

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

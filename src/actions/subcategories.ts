'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db';
import { subcategories } from '@/db/schema';
import { and, asc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { copy } from '@/lib/copy';
import { SUBCATEGORIES, type Area } from '@/lib/constants';

const areaSchema = z.enum(['TI', 'MKT', 'PF']);
const labelSchema = z.string().trim().min(1).max(60);

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  if (!session.user.isAdmin) return null;
  return session.user;
}

let seedPromise: Promise<void> | null = null;

async function seedDefaultSubcategoriesOnce() {
  const records = (['TI', 'MKT', 'PF'] as const).flatMap((area) =>
    SUBCATEGORIES[area].map((label, index) => ({
      area,
      label,
      sortOrder: (index + 1) * 10,
    })),
  );

  if (records.length === 0) return;
  await db.insert(subcategories).values(records).onConflictDoNothing();
}

async function ensureSeeded() {
  if (!seedPromise) seedPromise = seedDefaultSubcategoriesOnce().catch(() => {
    seedPromise = null;
  });
  return seedPromise;
}

export async function getSubcategoriesForArea(area: Area, includeInactive = false) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  await ensureSeeded();
  const conditions = [eq(subcategories.area, area)];
  if (!includeInactive) conditions.push(eq(subcategories.isActive, true));
  return db
    .select({
      id: subcategories.id,
      area: subcategories.area,
      label: subcategories.label,
      sortOrder: subcategories.sortOrder,
      isActive: subcategories.isActive,
    })
    .from(subcategories)
    .where(and(...conditions))
    .orderBy(asc(subcategories.sortOrder), asc(subcategories.label));
}

export async function getAllSubcategoriesGrouped() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  await ensureSeeded();
  const rows = await db
    .select({
      id: subcategories.id,
      area: subcategories.area,
      label: subcategories.label,
      sortOrder: subcategories.sortOrder,
      isActive: subcategories.isActive,
    })
    .from(subcategories)
    .orderBy(asc(subcategories.sortOrder), asc(subcategories.label));

  return {
    TI: rows.filter((r) => r.area === 'TI'),
    MKT: rows.filter((r) => r.area === 'MKT'),
    PF: rows.filter((r) => r.area === 'PF'),
  };
}

export async function isValidSubcategoryAsync(area: Area, label: string): Promise<boolean> {
  await ensureSeeded();
  const [match] = await db
    .select({ id: subcategories.id })
    .from(subcategories)
    .where(
      and(
        eq(subcategories.area, area),
        eq(subcategories.label, label),
        eq(subcategories.isActive, true),
      ),
    )
    .limit(1);
  return !!match;
}

const addSchema = z.object({ area: areaSchema, label: labelSchema });

export async function addSubcategory(formData: FormData) {
  const user = await requireAdmin();
  if (!user) return { error: copy.auth.errors.permissionDenied };

  const parsed = addSchema.safeParse({
    area: formData.get('area'),
    label: formData.get('label'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? copy.validation.invalidData };
  }

  await ensureSeeded();

  const [existing] = await db
    .select({ id: subcategories.id, isActive: subcategories.isActive })
    .from(subcategories)
    .where(and(eq(subcategories.area, parsed.data.area), eq(subcategories.label, parsed.data.label)))
    .limit(1);

  if (existing) {
    if (existing.isActive) {
      return { error: copy.subcategoriesAdmin.duplicate };
    }
    await db
      .update(subcategories)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(subcategories.id, existing.id));
  } else {
    const [maxRow] = await db
      .select({ maxOrder: sql<number>`coalesce(max(${subcategories.sortOrder}), 0)` })
      .from(subcategories)
      .where(eq(subcategories.area, parsed.data.area));
    const nextOrder = Number(maxRow?.maxOrder ?? 0) + 10;

    await db.insert(subcategories).values({
      area: parsed.data.area,
      label: parsed.data.label,
      sortOrder: nextOrder,
    });
  }

  revalidatePath('/configuracoes');
  return { ok: true, label: parsed.data.label };
}

const idSchema = z.string().uuid();

export async function toggleSubcategoryActive(id: string) {
  const user = await requireAdmin();
  if (!user) return { error: copy.auth.errors.permissionDenied };

  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { error: copy.validation.invalidData };

  const [row] = await db
    .select({ isActive: subcategories.isActive, label: subcategories.label })
    .from(subcategories)
    .where(eq(subcategories.id, parsed.data))
    .limit(1);
  if (!row) return { error: copy.validation.invalidData };

  await db
    .update(subcategories)
    .set({ isActive: !row.isActive, updatedAt: new Date() })
    .where(eq(subcategories.id, parsed.data));

  revalidatePath('/configuracoes');
  return { ok: true, label: row.label, nowActive: !row.isActive };
}

const reorderSchema = z.object({ id: idSchema, direction: z.enum(['up', 'down']) });

export async function reorderSubcategory(formData: FormData) {
  const user = await requireAdmin();
  if (!user) return { error: copy.auth.errors.permissionDenied };

  const parsed = reorderSchema.safeParse({
    id: formData.get('id'),
    direction: formData.get('direction'),
  });
  if (!parsed.success) return { error: copy.validation.invalidData };

  const [current] = await db
    .select({ id: subcategories.id, area: subcategories.area, sortOrder: subcategories.sortOrder })
    .from(subcategories)
    .where(eq(subcategories.id, parsed.data.id))
    .limit(1);
  if (!current) return { error: copy.validation.invalidData };

  const isUp = parsed.data.direction === 'up';
  const neighbor = await db
    .select({ id: subcategories.id, sortOrder: subcategories.sortOrder })
    .from(subcategories)
    .where(eq(subcategories.area, current.area))
    .orderBy(isUp ? sql`${subcategories.sortOrder} desc` : asc(subcategories.sortOrder));

  const index = neighbor.findIndex((row) => row.id === current.id);
  const target = isUp
    ? neighbor.find((row, idx) => idx > index && row.sortOrder < current.sortOrder)
    : neighbor.find((row, idx) => idx > index && row.sortOrder > current.sortOrder);
  if (!target) return { ok: true };

  await db
    .update(subcategories)
    .set({ sortOrder: target.sortOrder, updatedAt: new Date() })
    .where(eq(subcategories.id, current.id));
  await db
    .update(subcategories)
    .set({ sortOrder: current.sortOrder, updatedAt: new Date() })
    .where(eq(subcategories.id, target.id));

  revalidatePath('/configuracoes');
  return { ok: true };
}

export async function deleteSubcategory(id: string) {
  const user = await requireAdmin();
  if (!user) return { error: copy.auth.errors.permissionDenied };

  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { error: copy.validation.invalidData };

  const [row] = await db
    .select({ label: subcategories.label })
    .from(subcategories)
    .where(eq(subcategories.id, parsed.data))
    .limit(1);
  if (!row) return { error: copy.validation.invalidData };

  await db.delete(subcategories).where(eq(subcategories.id, parsed.data));
  revalidatePath('/configuracoes');
  return { ok: true, label: row.label };
}

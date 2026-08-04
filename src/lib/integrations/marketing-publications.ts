import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { marketingPublications } from '@/db/schema';

export const publicationStatuses = [
  'draft',
  'review',
  'approved',
  'scheduled',
  'published',
  'failed',
] as const;
export type PublicationStatus = (typeof publicationStatuses)[number];

const optionalUuid = z.string().uuid().nullish();
export const publicationDraftSchema = z.object({
  title: z.string().trim().min(1).max(160),
  caption: z.string().trim().max(10_000).nullish(),
  channels: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  assetUrls: z.array(z.string().url().max(2000)).max(50).default([]),
  scheduledFor: z.coerce.date().nullish(),
  ticketId: optionalUuid,
  recordingId: optionalUuid,
});

const ALLOWED_TRANSITIONS: Record<PublicationStatus, PublicationStatus[]> = {
  draft: ['review'],
  review: ['draft', 'approved'],
  approved: ['draft', 'scheduled'],
  scheduled: ['approved', 'published', 'failed'],
  published: [],
  failed: ['approved', 'scheduled'],
};

export function canTransitionPublication(from: PublicationStatus, to: PublicationStatus) {
  return from === to || ALLOWED_TRANSITIONS[from].includes(to);
}

export async function createPublicationDraft(
  input: z.input<typeof publicationDraftSchema>,
  createdById: string | null = null,
) {
  const value = publicationDraftSchema.parse(input);
  const [created] = await db
    .insert(marketingPublications)
    .values({
      ...value,
      caption: value.caption || null,
      scheduledFor: value.scheduledFor || null,
      ticketId: value.ticketId || null,
      recordingId: value.recordingId || null,
      createdById,
      status: 'draft',
    })
    .returning();
  return created;
}

export async function listPublications(statuses?: PublicationStatus[]) {
  return db
    .select()
    .from(marketingPublications)
    .where(statuses?.length ? inArray(marketingPublications.status, statuses) : undefined)
    .orderBy(desc(marketingPublications.updatedAt), asc(marketingPublications.scheduledFor));
}

export async function transitionPublication(
  id: string,
  to: PublicationStatus,
  extra: { postizId?: string; failureReason?: string | null } = {},
) {
  const [existing] = await db
    .select()
    .from(marketingPublications)
    .where(eq(marketingPublications.id, id))
    .limit(1);
  if (!existing) throw new Error('publication_not_found');
  const from = existing.status as PublicationStatus;
  if (!publicationStatuses.includes(from) || !canTransitionPublication(from, to)) {
    throw new Error(`invalid_publication_transition:${from}:${to}`);
  }
  const now = new Date();
  const [updated] = await db
    .update(marketingPublications)
    .set({
      status: to,
      postizId: extra.postizId ?? existing.postizId,
      failureReason: extra.failureReason === undefined ? existing.failureReason : extra.failureReason,
      approvedAt: to === 'approved' && !existing.approvedAt ? now : existing.approvedAt,
      publishedAt: to === 'published' ? now : existing.publishedAt,
      updatedAt: now,
    })
    .where(eq(marketingPublications.id, id))
    .returning();
  return updated;
}

export async function applyPostizResult(input: {
  helperPublicationId?: string;
  postizId?: string;
  status: 'scheduled' | 'published' | 'failed';
  publishedUrls?: Record<string, string>;
  metrics?: Record<string, number>;
  failureReason?: string | null;
}) {
  const conditions = [];
  if (input.helperPublicationId) conditions.push(eq(marketingPublications.id, input.helperPublicationId));
  if (input.postizId) conditions.push(eq(marketingPublications.postizId, input.postizId));
  if (conditions.length === 0) throw new Error('publication_identifier_required');
  const [existing] = await db.select().from(marketingPublications).where(and(...conditions)).limit(1);
  if (!existing) throw new Error('publication_not_found');

  const current = existing.status as PublicationStatus;
  if (!canTransitionPublication(current, input.status)) {
    throw new Error(`invalid_publication_transition:${current}:${input.status}`);
  }
  const now = new Date();
  const [updated] = await db
    .update(marketingPublications)
    .set({
      status: input.status,
      postizId: input.postizId ?? existing.postizId,
      publishedUrls: input.publishedUrls ?? existing.publishedUrls,
      metrics: input.metrics ?? existing.metrics,
      failureReason: input.failureReason ?? null,
      publishedAt: input.status === 'published' ? now : existing.publishedAt,
      updatedAt: now,
    })
    .where(eq(marketingPublications.id, existing.id))
    .returning();
  return updated;
}

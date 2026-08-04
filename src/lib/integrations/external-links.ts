import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { externalLinks } from '@/db/schema';

export async function findExternalLinkByLocal(
  provider: string,
  resourceType: string,
  localId: string,
) {
  const [row] = await db
    .select()
    .from(externalLinks)
    .where(
      and(
        eq(externalLinks.provider, provider),
        eq(externalLinks.resourceType, resourceType),
        eq(externalLinks.localId, localId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function findExternalLinkByExternal(
  provider: string,
  externalId: string,
) {
  const [row] = await db
    .select()
    .from(externalLinks)
    .where(and(eq(externalLinks.provider, provider), eq(externalLinks.externalId, externalId)))
    .limit(1);
  return row ?? null;
}

export async function saveExternalLink(input: {
  provider: string;
  resourceType: string;
  localId: string;
  externalId: string;
  metadata?: Record<string, unknown>;
}) {
  const now = new Date();
  const [row] = await db
    .insert(externalLinks)
    .values({ ...input, metadata: input.metadata ?? {}, lastSyncedAt: now })
    .onConflictDoUpdate({
      target: [externalLinks.provider, externalLinks.resourceType, externalLinks.localId],
      set: {
        externalId: input.externalId,
        metadata: input.metadata ?? {},
        lastSyncedAt: now,
        updatedAt: now,
      },
    })
    .returning();
  return row;
}

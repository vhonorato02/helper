'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth-helpers';
import {
  createPublicationDraft,
  listPublications,
  publicationStatuses,
  transitionPublication,
} from '@/lib/integrations/marketing-publications';

export async function getMarketingPublications() {
  await requireAuth();
  return listPublications();
}

export async function createMarketingPublication(formData: FormData) {
  const user = await requireAuth();
  const channels = formData.getAll('channels').map(String);
  const assetUrls = String(formData.get('assetUrls') ?? '')
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
  try {
    const created = await createPublicationDraft(
      {
        title: String(formData.get('title') ?? ''),
        caption: String(formData.get('caption') ?? '') || null,
        channels,
        assetUrls,
        scheduledFor: String(formData.get('scheduledFor') ?? '') || null,
        ticketId: String(formData.get('ticketId') ?? '') || null,
        recordingId: String(formData.get('recordingId') ?? '') || null,
      },
      user.id,
    );
    revalidatePath('/marketing/publicacoes');
    return { ok: true, id: created.id };
  } catch {
    return { error: 'Não foi possível criar a publicação.' };
  }
}

export async function changeMarketingPublicationStatus(id: string, status: string) {
  await requireAuth();
  const parsed = z.object({ id: z.string().uuid(), status: z.enum(publicationStatuses) }).safeParse({ id, status });
  if (!parsed.success) return { error: 'Dados inválidos.' };
  try {
    await transitionPublication(parsed.data.id, parsed.data.status);
    revalidatePath('/marketing/publicacoes');
    return { ok: true };
  } catch {
    return { error: 'Transição de status não permitida.' };
  }
}

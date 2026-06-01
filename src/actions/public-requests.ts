'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { desc, like, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { ticketHistory, tickets } from '@/db/schema';
import { copy } from '@/lib/copy';
import { AREA_LABELS, type Area, type Priority } from '@/lib/constants';
import {
  buildSimpleEmail,
  sendGenericEmail,
  sendTicketNotification,
} from '@/lib/email';
import { checkRateLimit } from '@/lib/rate-limit';
import { dispatchNotificationToAdmins } from '@/actions/notifications';
import { validatePublicRequestSchedule } from '@/lib/public-requests';

const publicKindSchema = z.enum(['ti', 'midia', 'arte', 'cobertura', 'outra']);
const prioritySchema = z.enum(['baixa', 'media', 'alta', 'urgente']);
const publicRequestSchema = z.object({
  kind: publicKindSchema,
  requesterName: z.string().trim().min(2).max(120),
  requesterContact: z.string().trim().max(120).optional(),
  location: z.string().trim().min(1).max(120),
  title: z.string().trim().min(4).max(100),
  description: z.string().trim().min(10).max(2500),
  priority: prioritySchema.default('media'),
  desiredDate: z.string().trim().max(20).optional(),
  startTime: z.string().trim().max(10).optional(),
  endTime: z.string().trim().max(10).optional(),
  channel: z.string().trim().max(160).optional(),
  website: z.string().trim().max(120).optional(),
});

type PublicRequestInput = z.infer<typeof publicRequestSchema>;

const PUBLIC_LIMIT = { limit: 5, windowMs: 60_000, lockoutMs: 5 * 60_000 };

let publicRequestSchemaPromise: Promise<void> | null = null;

async function ensurePublicRequestSchema() {
  publicRequestSchemaPromise ??= db
    .execute(sql`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS public_contact text`)
    .then(() => undefined);
  return publicRequestSchemaPromise;
}

const REQUEST_META: Record<
  PublicRequestInput['kind'],
  { area: Area; subcategory: string; titlePrefix: string; protocolPrefix: string }
> = {
  ti: { area: 'TI', subcategory: 'Outro', titlePrefix: 'Suporte TI', protocolPrefix: 'TI' },
  midia: { area: 'MKT', subcategory: 'Fotografia', titlePrefix: 'Foto/Vídeo', protocolPrefix: 'MKT' },
  arte: { area: 'MKT', subcategory: 'Arte impressa', titlePrefix: 'Arte/Divulgação', protocolPrefix: 'MKT' },
  cobertura: { area: 'MKT', subcategory: 'Evento', titlePrefix: 'Cobertura de evento', protocolPrefix: 'MKT' },
  outra: { area: 'PF', subcategory: 'Outro', titlePrefix: 'Solicitação externa', protocolPrefix: 'PF' },
};

function publicHoneypotFilled(input: PublicRequestInput) {
  return !!input.website?.trim();
}

async function getClientIp() {
  const requestHeaders = await headers();
  return (
    requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    requestHeaders.get('x-real-ip') ||
    'unknown'
  );
}

function isEmail(value: string | null | undefined) {
  return !!value && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value) && !/[\r\n]/.test(value);
}

function normalizeOptionalText(value: string | undefined) {
  return value && value.length > 0 ? value : null;
}

function fakeProtocol(prefix = 'PUB') {
  return `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

async function generateCode(area: Area): Promise<string> {
  const result = await db
    .select({ code: tickets.code })
    .from(tickets)
    .where(like(tickets.code, `${area}-%`))
    .orderBy(desc(tickets.code))
    .limit(1);

  if (result.length === 0) return `${area}-0001`;

  const last = result[0].code;
  const nextNumber = Number.parseInt(last.split('-')[1] ?? '0', 10) + 1;
  return `${area}-${nextNumber.toString().padStart(4, '0')}`;
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    String(error.message).toLowerCase().includes('unique')
  );
}

function buildDescription(input: PublicRequestInput) {
  return [
    `[SOLICITAÇÃO PÚBLICA]`,
    `Solicitante: ${input.requesterName}`,
    `Contato: ${input.requesterContact || 'Não informado'}`,
    `Local/setor: ${input.location}`,
    input.desiredDate ? `Data desejada/evento: ${input.desiredDate}` : null,
    input.startTime || input.endTime
      ? `Horário: ${input.startTime || 'início não informado'} - ${input.endTime || 'término não informado'}`
      : null,
    input.channel ? `Canal/uso esperado: ${input.channel}` : null,
    '',
    input.description,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
}

function parsePublicRequest(formData: FormData) {
  return publicRequestSchema.safeParse({
    kind: formData.get('kind'),
    requesterName: formData.get('requesterName'),
    requesterContact: formData.get('requesterContact') || undefined,
    location: formData.get('location'),
    title: formData.get('title'),
    description: formData.get('description'),
    priority: formData.get('priority') || 'media',
    desiredDate: formData.get('desiredDate') || undefined,
    startTime: formData.get('startTime') || undefined,
    endTime: formData.get('endTime') || undefined,
    channel: formData.get('channel') || undefined,
    website: formData.get('website') || undefined,
  });
}

export async function createPublicRequest(formData: FormData) {
  const parsed = parsePublicRequest(formData);
  if (!parsed.success) return { error: copy.validation.invalidData };

  const input = parsed.data;
  const meta = REQUEST_META[input.kind];

  if (publicHoneypotFilled(input)) {
    return { ok: true, protocol: fakeProtocol(meta.protocolPrefix) };
  }

  const schedule = validatePublicRequestSchedule(input);
  if (!schedule.ok) return { error: schedule.error };

  const ip = await getClientIp();
  const rate = checkRateLimit({ key: `public-request:${input.kind}:${ip}`, ...PUBLIC_LIMIT });
  if (!rate.ok) return { error: copy.validation.rateLimited };

  const title = `${meta.titlePrefix}: ${input.title}`;
  const description = buildDescription(input);
  const origin = 'Pagina publica';
  const publicContact = normalizeOptionalText(input.requesterContact);
  await ensurePublicRequestSchema();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = await generateCode(meta.area);
    try {
      const [created] = await db
        .insert(tickets)
        .values({
          code,
          area: meta.area,
          title,
          subcategory: meta.subcategory,
          priority: input.priority as Priority,
          description,
          origin,
          location: input.location,
          publicContact,
          authorId: null,
        })
        .returning({ id: tickets.id });

      await db.insert(ticketHistory).values({
        ticketId: created.id,
        authorId: null,
        field: 'created',
        oldValue: null,
        newValue: 'Solicitação pública criada',
      });

      await sendTicketNotification({
        type: 'ticket_created',
        actorName: input.requesterName,
        publicRequest: true,
        ticket: {
          code,
          area: meta.area,
          title,
          subcategory: meta.subcategory,
          priority: input.priority as Priority,
          status: 'aberto',
          origin,
        },
      });

      await dispatchNotificationToAdmins({
        type: 'public_request_created',
        title: `Solicitação pública ${code}`,
        body: title,
        link: `/tickets/${code}`,
        ticketId: created.id,
      });

      const protocol = `PUB-${code}`;
      if (isEmail(input.requesterContact)) {
        const { html, text } = buildSimpleEmail({
          title: `Solicitação ${protocol} recebida`,
          intro: `Recebemos sua solicitação para ${AREA_LABELS[meta.area]}.`,
          items: [
            {
              heading: 'Resumo',
              lines: [title, `Local/setor: ${input.location}`, `Prioridade: ${input.priority}`],
            },
          ],
        });
        await sendGenericEmail({
          to: [input.requesterContact!],
          subject: `[Helper] Solicitação ${protocol} recebida`,
          html,
          text,
          tag: 'public_request_confirmation',
        });
      }

      revalidatePath('/');
      revalidatePath('/tickets');
      revalidatePath('/kanban');
      return { ok: true, protocol, code };
    } catch (error) {
      if (attempt < 4 && isUniqueConstraintError(error)) continue;
      throw error;
    }
  }

  return { error: copy.validation.invalidData };
}

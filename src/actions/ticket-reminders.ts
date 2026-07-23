'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { schedules, tickets } from '@/db/schema';
import { copy } from '@/lib/copy';
import { canManageTicket } from '@/lib/ticket-access';
import { requireAuth } from '@/lib/auth-helpers';
import { parseAppLocalDateTime } from '@/lib/timezone';

const reminderSchema = z.object({
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  note: z.string().trim().max(500).optional(),
  reminderMinutesBefore: z.coerce.number().int().min(0).max(1440).default(10),
});

function parseLocalDateTime(value: string) {
  return parseAppLocalDateTime(value);
}

export async function createTicketReminder(code: string, formData: FormData) {
  const user = await requireAuth();

  const parsed = reminderSchema.safeParse({
    scheduledDate: formData.get('scheduledDate'),
    note: formData.get('note') || undefined,
    reminderMinutesBefore: formData.get('reminderMinutesBefore') || 10,
  });
  if (!parsed.success) return { error: copy.validation.invalidData };

  const scheduledDate = parseLocalDateTime(parsed.data.scheduledDate);
  if (!scheduledDate) return { error: copy.validation.invalidDate };
  if (scheduledDate.getTime() < Date.now() - 60_000) {
    return { error: 'Escolha um horário futuro para o lembrete.' };
  }

  const [ticket] = await db
    .select({
      id: tickets.id,
      code: tickets.code,
      title: tickets.title,
      area: tickets.area,
    })
    .from(tickets)
    .where(eq(tickets.code, code))
    .limit(1);

  if (!ticket) return { error: copy.validation.invalidTicket };
  if (!canManageTicket(user, ticket)) return { error: copy.auth.errors.permissionDenied };

  await db.insert(schedules).values({
    title: `Lembrete ${ticket.code}: ${ticket.title}`.slice(0, 120),
    description: [parsed.data.note, `Demanda: /tickets/${ticket.code}`].filter(Boolean).join('\n'),
    scheduledDate,
    area: ticket.area,
    reminderMinutesBefore: parsed.data.reminderMinutesBefore,
    repeatReminder: true,
    authorId: user.id,
  });

  revalidatePath('/agendamentos');
  revalidatePath('/notificacoes');
  revalidatePath(`/tickets/${ticket.code}`);
  return { ok: true };
}

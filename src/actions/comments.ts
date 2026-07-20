'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db';
import { comments, quickResponses, ticketHistory, ticketMentions, tickets, users } from '@/db/schema';
import { and, eq, asc, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { copy } from '@/lib/copy';
import { sendTicketNotification } from '@/lib/email';
import { extractMentions } from '@/lib/mentions';
import { checkRateLimit } from '@/lib/rate-limit';
import { dispatchNotification } from '@/actions/notifications';
import { isQuickResponseAvailableForTicket } from '@/lib/quick-responses';
import { canCommentOnTicket, canViewTicket } from '@/lib/ticket-access';

const COMMENT_RATE_LIMIT = { limit: 30, windowMs: 60_000, lockoutMs: 60_000 };

async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  return session.user;
}

const commentSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  quickResponseId: z.string().uuid().optional(),
});

const COMMENT_HISTORY_LIMIT = 220;

function commentHistorySnippet(body: string) {
  const normalized = body.replace(/\s+/g, ' ').trim();
  if (normalized.length <= COMMENT_HISTORY_LIMIT) return normalized;
  return `${normalized.slice(0, COMMENT_HISTORY_LIMIT - 3).trimEnd()}...`;
}

function revalidateCommentSurfaces(ticketCode: string) {
  revalidatePath('/');
  revalidatePath('/tickets');
  revalidatePath('/kanban');
  revalidatePath(`/tickets/${ticketCode}`);
}

async function persistMentions(ticketId: string, commentId: string, body: string) {
  const usernames = extractMentions(body);
  if (usernames.length === 0) return [];

  const mentionedUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(and(inArray(users.username, usernames), eq(users.isActive, true)));

  if (mentionedUsers.length === 0) return [];

  await db.insert(ticketMentions).values(
    mentionedUsers.map((u) => ({
      ticketId,
      commentId,
      userId: u.id,
    })),
  );

  return mentionedUsers.map((u) => u.id);
}

export async function addComment(ticketCode: string, formData: FormData) {
  const user = await requireAuth();

  const rate = checkRateLimit({
    key: `comment:${user.id}`,
    ...COMMENT_RATE_LIMIT,
  });
  if (!rate.ok) return { error: copy.validation.rateLimited };

  const parsed = commentSchema.safeParse({
    body: formData.get('body'),
    quickResponseId: formData.get('quickResponseId') || undefined,
  });
  if (!parsed.success) return { error: copy.validation.invalidComment };

  const [ticket] = await db
    .select({
      id: tickets.id,
      code: tickets.code,
      area: tickets.area,
      title: tickets.title,
      subcategory: tickets.subcategory,
      priority: tickets.priority,
      status: tickets.status,
      origin: tickets.origin,
      authorId: tickets.authorId,
      assigneeId: tickets.assigneeId,
    })
    .from(tickets)
    .where(eq(tickets.code, ticketCode))
    .limit(1);

  if (!ticket) return { error: copy.validation.invalidTicket };
  if (!canCommentOnTicket(user, ticket)) return { error: copy.auth.errors.permissionDenied };

  let selectedQuickResponse: { id: string; title: string; area: typeof ticket.area | null } | null = null;
  if (parsed.data.quickResponseId) {
    const [response] = await db
      .select({
        id: quickResponses.id,
        title: quickResponses.title,
        area: quickResponses.area,
      })
      .from(quickResponses)
      .where(
        and(
          eq(quickResponses.id, parsed.data.quickResponseId),
          eq(quickResponses.isActive, true),
        ),
      )
      .limit(1);

    if (!response || !isQuickResponseAvailableForTicket(response.area, ticket.area)) {
      return { error: copy.validation.invalidQuickResponse };
    }
    selectedQuickResponse = response;
  }

  const [inserted] = await db
    .insert(comments)
    .values({
      ticketId: ticket.id,
      authorId: user.id,
      body: parsed.data.body,
    })
    .returning({ id: comments.id });

  if (!inserted) return { error: copy.validation.serverError };

  const mentionedUserIds = await persistMentions(ticket.id, inserted.id, parsed.data.body);

  await db.insert(ticketHistory).values({
    ticketId: ticket.id,
    authorId: user.id,
    field: 'comment_added',
    oldValue: null,
    newValue: commentHistorySnippet(parsed.data.body),
  });

  if (selectedQuickResponse) {
    await db
      .update(quickResponses)
      .set({
        usageCount: sql`${quickResponses.usageCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(quickResponses.id, selectedQuickResponse.id));

    await db.insert(ticketHistory).values({
      ticketId: ticket.id,
      authorId: user.id,
      field: 'quick_response_used',
      oldValue: null,
      newValue: selectedQuickResponse.title,
    });
  }

  await db.update(tickets).set({ updatedAt: new Date() }).where(eq(tickets.code, ticketCode));

  const emailResult = await sendTicketNotification({
    type: 'ticket_comment_added',
    actorName: user.name ?? user.username,
    commentSnippet: commentHistorySnippet(parsed.data.body),
    ticket: {
      code: ticket.code,
      area: ticket.area,
      title: ticket.title,
      subcategory: ticket.subcategory,
      priority: ticket.priority,
      status: ticket.status,
      origin: ticket.origin,
    },
  });

  await dispatchNotification({
    userIds: mentionedUserIds.filter((id) => id !== user.id),
    type: 'comment_mention',
    title: `Você foi mencionado em ${ticket.code}`,
    body: commentHistorySnippet(parsed.data.body),
    link: `/tickets/${ticket.code}`,
    ticketId: ticket.id,
  });

  revalidateCommentSurfaces(ticketCode);
  if (selectedQuickResponse) revalidatePath('/respostas-rapidas');
  return {
    ok: true,
    emailWarning: emailResult.ok ? undefined : copy.validation.emailNotificationFailed,
  };
}

async function getCommentWithTicket(commentId: string, ticketCode: string) {
  const [record] = await db
    .select({
      id: comments.id,
      authorId: comments.authorId,
      body: comments.body,
      ticketId: comments.ticketId,
      ticketCode: tickets.code,
      ticketArea: tickets.area,
      ticketAuthorId: tickets.authorId,
      ticketAssigneeId: tickets.assigneeId,
    })
    .from(comments)
    .innerJoin(tickets, eq(comments.ticketId, tickets.id))
    .where(and(eq(comments.id, commentId), eq(tickets.code, ticketCode)))
    .limit(1);

  return record ?? null;
}

function canManageComment(
  user: { id: string; isAdmin?: boolean },
  comment: { authorId: string | null },
) {
  return user.isAdmin || comment.authorId === user.id;
}

export async function updateComment(ticketCode: string, commentId: string, formData: FormData) {
  const user = await requireAuth();
  const parsedId = z.string().uuid().safeParse(commentId);
  const parsedBody = commentSchema.safeParse({ body: formData.get('body') });

  if (!parsedId.success || !parsedBody.success) return { error: copy.validation.invalidComment };

  const comment = await getCommentWithTicket(parsedId.data, ticketCode);
  if (!comment) return { error: copy.validation.invalidComment };
  if (
    !canCommentOnTicket(user, {
      area: comment.ticketArea,
      authorId: comment.ticketAuthorId,
      assigneeId: comment.ticketAssigneeId,
    })
  ) {
    return { error: copy.auth.errors.permissionDenied };
  }
  if (!canManageComment(user, comment)) return { error: copy.auth.errors.permissionDenied };
  if (comment.body === parsedBody.data.body) return { ok: true };

  await db
    .update(comments)
    .set({ body: parsedBody.data.body })
    .where(eq(comments.id, parsedId.data));
  await db.insert(ticketHistory).values({
    ticketId: comment.ticketId,
    authorId: user.id,
    field: 'comment_edited',
    oldValue: commentHistorySnippet(comment.body),
    newValue: commentHistorySnippet(parsedBody.data.body),
  });
  await db.update(tickets).set({ updatedAt: new Date() }).where(eq(tickets.code, ticketCode));

  revalidateCommentSurfaces(ticketCode);
  return { ok: true };
}

export async function deleteComment(ticketCode: string, commentId: string) {
  const user = await requireAuth();
  const parsedId = z.string().uuid().safeParse(commentId);
  if (!parsedId.success) return { error: copy.validation.invalidComment };

  const comment = await getCommentWithTicket(parsedId.data, ticketCode);
  if (!comment) return { error: copy.validation.invalidComment };
  if (
    !canCommentOnTicket(user, {
      area: comment.ticketArea,
      authorId: comment.ticketAuthorId,
      assigneeId: comment.ticketAssigneeId,
    })
  ) {
    return { error: copy.auth.errors.permissionDenied };
  }
  if (!canManageComment(user, comment)) return { error: copy.auth.errors.permissionDenied };

  await db.insert(ticketHistory).values({
    ticketId: comment.ticketId,
    authorId: user.id,
    field: 'comment_deleted',
    oldValue: commentHistorySnippet(comment.body),
    newValue: null,
  });
  await db.delete(comments).where(eq(comments.id, parsedId.data));
  await db.update(tickets).set({ updatedAt: new Date() }).where(eq(tickets.code, ticketCode));

  revalidateCommentSurfaces(ticketCode);
  return { ok: true };
}

export async function getComments(ticketCode: string) {
  const user = await requireAuth();

  const [ticket] = await db
    .select({
      id: tickets.id,
      area: tickets.area,
      authorId: tickets.authorId,
      assigneeId: tickets.assigneeId,
    })
    .from(tickets)
    .where(eq(tickets.code, ticketCode))
    .limit(1);

  if (!ticket) return [];
  if (!canViewTicket(user, ticket)) return [];

  return db
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      authorId: comments.authorId,
      authorName: users.displayName,
    })
    .from(comments)
    .leftJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.ticketId, ticket.id))
    .orderBy(asc(comments.createdAt));
}

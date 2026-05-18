'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db';
import { comments, ticketHistory, tickets, users } from '@/db/schema';
import { and, eq, asc } from 'drizzle-orm';
import { z } from 'zod';
import { copy } from '@/lib/copy';

async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  return session.user;
}

const commentSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

const COMMENT_HISTORY_LIMIT = 220;

function commentHistorySnippet(body: string) {
  const normalized = body.replace(/\s+/g, ' ').trim();
  if (normalized.length <= COMMENT_HISTORY_LIMIT) return normalized;
  return `${normalized.slice(0, COMMENT_HISTORY_LIMIT - 1).trimEnd()}…`;
}

function revalidateCommentSurfaces(ticketCode: string) {
  revalidatePath('/');
  revalidatePath('/tickets');
  revalidatePath('/kanban');
  revalidatePath(`/tickets/${ticketCode}`);
}

export async function addComment(ticketCode: string, formData: FormData) {
  const user = await requireAuth();

  const parsed = commentSchema.safeParse({ body: formData.get('body') });
  if (!parsed.success) return { error: copy.validation.invalidComment };

  const [ticket] = await db
    .select({ id: tickets.id })
    .from(tickets)
    .where(eq(tickets.code, ticketCode))
    .limit(1);

  if (!ticket) return { error: copy.validation.invalidTicket };

  await db.transaction(async (tx) => {
    await tx.insert(comments).values({
      ticketId: ticket.id,
      authorId: user.id,
      body: parsed.data.body,
    });
    await tx.insert(ticketHistory).values({
      ticketId: ticket.id,
      authorId: user.id,
      field: 'comment_added',
      oldValue: null,
      newValue: commentHistorySnippet(parsed.data.body),
    });
    await tx.update(tickets).set({ updatedAt: new Date() }).where(eq(tickets.code, ticketCode));
  });

  revalidateCommentSurfaces(ticketCode);
  return { ok: true };
}

async function getCommentWithTicket(commentId: string, ticketCode: string) {
  const [record] = await db
    .select({
      id: comments.id,
      authorId: comments.authorId,
      body: comments.body,
      ticketId: comments.ticketId,
      ticketCode: tickets.code,
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
  if (!canManageComment(user, comment)) return { error: copy.auth.errors.permissionDenied };
  if (comment.body === parsedBody.data.body) return { ok: true };

  await db.transaction(async (tx) => {
    await tx
      .update(comments)
      .set({ body: parsedBody.data.body })
      .where(eq(comments.id, parsedId.data));
    await tx.insert(ticketHistory).values({
      ticketId: comment.ticketId,
      authorId: user.id,
      field: 'comment_edited',
      oldValue: commentHistorySnippet(comment.body),
      newValue: commentHistorySnippet(parsedBody.data.body),
    });
    await tx.update(tickets).set({ updatedAt: new Date() }).where(eq(tickets.code, ticketCode));
  });

  revalidateCommentSurfaces(ticketCode);
  return { ok: true };
}

export async function deleteComment(ticketCode: string, commentId: string) {
  const user = await requireAuth();
  const parsedId = z.string().uuid().safeParse(commentId);
  if (!parsedId.success) return { error: copy.validation.invalidComment };

  const comment = await getCommentWithTicket(parsedId.data, ticketCode);
  if (!comment) return { error: copy.validation.invalidComment };
  if (!canManageComment(user, comment)) return { error: copy.auth.errors.permissionDenied };

  await db.transaction(async (tx) => {
    await tx.insert(ticketHistory).values({
      ticketId: comment.ticketId,
      authorId: user.id,
      field: 'comment_deleted',
      oldValue: commentHistorySnippet(comment.body),
      newValue: null,
    });
    await tx.delete(comments).where(eq(comments.id, parsedId.data));
    await tx.update(tickets).set({ updatedAt: new Date() }).where(eq(tickets.code, ticketCode));
  });

  revalidateCommentSurfaces(ticketCode);
  return { ok: true };
}

export async function getComments(ticketCode: string) {
  const [ticket] = await db
    .select({ id: tickets.id })
    .from(tickets)
    .where(eq(tickets.code, ticketCode))
    .limit(1);

  if (!ticket) return [];

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

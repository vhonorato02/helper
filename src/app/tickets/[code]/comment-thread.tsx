'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Loader2,
  MessageSquare,
  MessageSquareQuote,
  MoreVertical,
  Pencil,
  SendHorizontal,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { addComment, deleteComment, updateComment } from '@/actions/comments';
import { copy } from '@/lib/copy';
import { AREA_LABELS } from '@/lib/constants';
import { initials } from '@/lib/format';

interface Comment {
  id: string;
  body: string;
  createdAt: Date;
  authorId: string | null;
  authorName: string | null;
}

interface QuickResponseOption {
  id: string;
  area: keyof typeof AREA_LABELS | null;
  title: string;
  body: string;
  usageCount: number;
}

interface CommentThreadProps {
  ticketCode: string;
  comments: Comment[];
  quickResponses: QuickResponseOption[];
  currentUserId: string;
  currentUserIsAdmin: boolean;
}

export function CommentThread({
  ticketCode,
  comments,
  quickResponses,
  currentUserId,
  currentUserIsAdmin,
}: CommentThreadProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [selectedQuickResponseId, setSelectedQuickResponseId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Comment | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const selectedQuickResponse = quickResponses.find((item) => item.id === selectedQuickResponseId);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const body = commentBody.trim();
    if (!body) return;
    formData.set('body', body);
    if (selectedQuickResponseId) formData.set('quickResponseId', selectedQuickResponseId);
    else formData.delete('quickResponseId');

    startTransition(async () => {
      const result = await addComment(ticketCode, formData);
      if (result && 'error' in result) {
        toast.error(result.error);
        return;
      }

      if (result?.emailWarning) toast.warning(result.emailWarning);

      setCommentBody('');
      setSelectedQuickResponseId(null);
      formRef.current?.reset();
      router.refresh();
    });
  };

  const applyQuickResponse = (response: QuickResponseOption) => {
    setCommentBody(response.body);
    setSelectedQuickResponseId(response.id);
  };

  const startEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditingBody(comment.body);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingBody('');
  };

  const saveEdit = (commentId: string) => {
    const body = editingBody.trim();
    if (!body) return;

    const formData = new FormData();
    formData.set('body', body);

    startTransition(async () => {
      const result = await updateComment(ticketCode, commentId, formData);
      if (result && 'error' in result) {
        toast.error(result.error);
        return;
      }

      toast.success(copy.tickets.comments.edited);
      cancelEdit();
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;

    startTransition(async () => {
      const result = await deleteComment(ticketCode, deleteTarget.id);
      if (result && 'error' in result) {
        toast.error(result.error);
        return;
      }

      toast.success(copy.tickets.comments.deleted);
      setDeleteTarget(null);
      router.refresh();
    });
  };

  return (
    <section className="space-y-4">
      <h2 className="section-label flex items-center gap-1.5">
        <MessageSquare className="size-3.5" />
        {comments.length === 0
          ? copy.tickets.comments.title
          : copy.tickets.comments.count(comments.length)}
      </h2>

      {comments.length > 0 && (
        <div className="space-y-4">
          {comments.map((comment) => {
            const authorName = comment.authorName ?? copy.tickets.comments.anonymous;
            const canManage = currentUserIsAdmin || comment.authorId === currentUserId;
            const isEditing = editingId === comment.id;

            return (
              <article key={comment.id} className="flex gap-3">
                <Avatar className="size-8 shrink-0 ring-2 ring-background">
                  <AvatarFallback className="text-[11px] font-bold bg-primary/10 text-primary">
                    {initials(authorName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex items-baseline gap-2 flex-wrap min-w-0 flex-1">
                      <span className="text-sm font-medium">{authorName}</span>
                      <time
                        dateTime={new Date(comment.createdAt).toISOString()}
                        className="text-xs text-muted-foreground"
                        suppressHydrationWarning
                      >
                        {formatDistanceToNow(new Date(comment.createdAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </time>
                    </div>

                    {canManage && !isEditing && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={copy.tickets.comments.actionsFor(authorName)}
                            disabled={isPending}
                          >
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => startEdit(comment)}>
                            <Pencil className="size-4" />
                            {copy.tickets.comments.edit}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => setDeleteTarget(comment)}
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          >
                            <Trash2 className="size-4" />
                            {copy.tickets.comments.delete}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editingBody}
                        onChange={(event) => setEditingBody(event.target.value)}
                        placeholder={copy.tickets.comments.editPlaceholder}
                        aria-label={copy.tickets.comments.edit}
                        className="min-h-[96px]"
                        disabled={isPending}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={cancelEdit}
                          disabled={isPending}
                        >
                          {copy.common.cancel}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => saveEdit(comment.id)}
                          disabled={isPending || !editingBody.trim()}
                        >
                          {isPending && <Loader2 className="animate-spin" />}
                          {copy.tickets.comments.saveEdit}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border/60 bg-card px-3.5 py-3 text-sm leading-relaxed shadow-xs whitespace-pre-wrap break-words">
                      {comment.body}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-2">
        {quickResponses.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  className="gap-1.5"
                >
                  <MessageSquareQuote className="size-3.5" />
                  {copy.quickResponses.insert}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[min(28rem,calc(100vw-2rem))]"
              >
                {quickResponses.map((response) => (
                  <DropdownMenuItem
                    key={response.id}
                    onSelect={() => applyQuickResponse(response)}
                    className="flex-col items-start gap-1 whitespace-normal"
                  >
                    <span className="flex w-full items-center justify-between gap-3">
                      <span className="font-medium">{response.title}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {response.area ? AREA_LABELS[response.area] : copy.quickResponses.global}
                      </span>
                    </span>
                    <span className="line-clamp-2 text-xs text-muted-foreground">
                      {response.body}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {selectedQuickResponse && (
              <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
                {copy.quickResponses.selected(selectedQuickResponse.title)}
              </span>
            )}
          </div>
        )}

        <Textarea
          name="body"
          placeholder={copy.tickets.comments.placeholder}
          aria-label={copy.tickets.comments.title}
          className="min-h-[88px]"
          value={commentBody}
          disabled={isPending}
          onChange={(event) => setCommentBody(event.currentTarget.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground hidden sm:block">
            {copy.tickets.comments.shortcut}
          </p>
          <Button
            type="submit"
            size="sm"
            disabled={isPending || !commentBody.trim()}
            className="ml-auto gap-1.5"
          >
            {isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <SendHorizontal className="size-3.5" />
            )}
            {copy.tickets.comments.submit}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={copy.tickets.comments.deleteTitle}
        description={copy.tickets.comments.deleteDescription}
        confirmLabel={copy.tickets.comments.delete}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </section>
  );
}

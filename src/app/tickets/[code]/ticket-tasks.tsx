'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckSquare, Loader2, Plus, Square, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  createTicketTask,
  deleteTicketTask,
  toggleTicketTask,
  type TicketTaskRow,
} from '@/actions/ticket-tasks';
import { cn } from '@/lib/utils';

interface TicketTasksProps {
  ticketCode: string;
  tasks: TicketTaskRow[];
  canManage: boolean;
}

export function TicketTasks({ ticketCode, tasks, canManage }: TicketTasksProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const completed = useMemo(() => tasks.filter((task) => task.isDone).length, [tasks]);
  const progress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const nextTitle = String(formData.get('title') ?? '').trim();
    if (!nextTitle) return;

    startTransition(async () => {
      const result = await createTicketTask(ticketCode, formData);
      if (result && 'error' in result) {
        toast.error(result.error);
        return;
      }
      setTitle('');
      toast.success('Item adicionado ao checklist.');
      router.refresh();
    });
  };

  const handleToggle = (task: TicketTaskRow) => {
    setPendingId(task.id);
    startTransition(async () => {
      const result = await toggleTicketTask(task.id, !task.isDone);
      setPendingId(null);
      if (result && 'error' in result) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  };

  const handleDelete = (task: TicketTaskRow) => {
    setPendingId(task.id);
    startTransition(async () => {
      const result = await deleteTicketTask(task.id);
      setPendingId(null);
      if (result && 'error' in result) {
        toast.error(result.error);
        return;
      }
      toast.success('Item removido do checklist.');
      router.refresh();
    });
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="section-label flex items-center gap-1.5">
            <CheckSquare className="size-3.5" />
            Checklist
          </h2>
          {tasks.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {completed}/{tasks.length} concluído{tasks.length === 1 ? '' : 's'}
            </p>
          )}
        </div>
        {tasks.length > 0 && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted sm:w-36">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border/60 bg-card shadow-xs">
        {tasks.length === 0 ? (
          <div className="px-4 py-5 text-sm text-muted-foreground">
            Quebre a demanda em passos menores quando ela precisar de acompanhamento.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {tasks.map((task) => {
              const busy = pendingId === task.id && isPending;
              return (
                <div key={task.id} className="flex items-start gap-3 px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => handleToggle(task)}
                    disabled={busy || !canManage}
                    className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-primary disabled:opacity-50"
                    aria-label={task.isDone ? 'Reabrir item' : 'Concluir item'}
                  >
                    {busy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : task.isDone ? (
                      <CheckSquare className="size-4 text-primary" />
                    ) : (
                      <Square className="size-4" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'text-sm leading-snug',
                        task.isDone && 'text-muted-foreground line-through',
                      )}
                    >
                      {task.title}
                    </p>
                    {task.authorName && (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        por {task.authorName}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(task)}
                    disabled={busy || !canManage}
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    aria-label="Remover item"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {canManage && (
          <form onSubmit={handleCreate} className="flex gap-2 border-t border-border/60 p-3">
            <Input
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={160}
              placeholder="Novo passo do atendimento..."
              className="h-9"
              disabled={isPending}
            />
            <Button type="submit" size="icon-sm" disabled={isPending || !title.trim()}>
              {isPending && !pendingId ? <Loader2 className="animate-spin" /> : <Plus />}
              <span className="sr-only">Adicionar item</span>
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}

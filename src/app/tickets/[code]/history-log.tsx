import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History } from 'lucide-react';
import { HISTORY_FIELD_LABELS, HISTORY_VALUE_LABELS } from '@/lib/constants';
import { copy } from '@/lib/copy';

function humanize(value: string | null | undefined): string {
  if (!value) return copy.tickets.history.noneValue;
  return HISTORY_VALUE_LABELS[value as keyof typeof HISTORY_VALUE_LABELS] ?? value;
}

interface HistoryEntry {
  id: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: Date;
  authorName: string | null;
}

const COMMENT_ACTIONS = {
  comment_added: copy.tickets.history.addedComment,
  comment_edited: copy.tickets.history.editedComment,
  comment_deleted: copy.tickets.history.deletedComment,
} as const;

const TASK_ACTIONS = {
  task_added: 'adicionou ao checklist',
  task_completed: 'concluiu no checklist',
  task_reopened: 'reabriu no checklist',
  task_deleted: 'removeu do checklist',
} as const;

const QUICK_RESPONSE_ACTIONS = {
  quick_response_used: 'usou a resposta rápida',
} as const;

function TimeAgo({ date }: { date: Date }) {
  return (
    <span className="text-muted-foreground/70">
      {' · '}
      <time
        dateTime={new Date(date).toISOString()}
        className="tabular-nums"
        suppressHydrationWarning
      >
        {formatDistanceToNow(new Date(date), {
          addSuffix: true,
          locale: ptBR,
        })}
      </time>
    </span>
  );
}

function CommentValue({ value }: { value: string | null }) {
  if (!value) return null;
  return <span className="font-medium text-foreground break-words">&quot;{value}&quot;</span>;
}

export function HistoryLog({ history }: { history: HistoryEntry[] }) {
  return (
    <section className="space-y-3">
      <h2 className="section-label flex items-center gap-1.5">
        <History className="size-3.5" />
        {copy.tickets.history.title}
      </h2>

      <ol className="relative ml-1.5 space-y-3.5 border-l border-border/60 pl-5">
        {history.map((entry) => {
          const commentAction = COMMENT_ACTIONS[entry.field as keyof typeof COMMENT_ACTIONS];
          const taskAction = TASK_ACTIONS[entry.field as keyof typeof TASK_ACTIONS];
          const quickResponseAction =
            QUICK_RESPONSE_ACTIONS[entry.field as keyof typeof QUICK_RESPONSE_ACTIONS];
          const authorName = entry.authorName ?? copy.common.removedUser;

          if (commentAction || taskAction || quickResponseAction) {
            return (
              <li key={entry.id} className="relative text-xs">
                <span className="absolute -left-[1.6875rem] top-1 size-2.5 rounded-full bg-background border-2 border-border" />
                <div className="text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">{authorName}</span>
                  {` ${commentAction ?? taskAction ?? quickResponseAction}`}
                  {entry.field === 'comment_edited' ? (
                    <>
                      {` ${copy.tickets.history.from} `}
                      <CommentValue value={entry.oldValue} />
                      {` ${copy.tickets.history.to} `}
                      <CommentValue value={entry.newValue} />
                    </>
                  ) : (
                    <>
                      {' '}
                      <CommentValue value={entry.newValue ?? entry.oldValue} />
                    </>
                  )}
                  <TimeAgo date={entry.createdAt} />
                </div>
              </li>
            );
          }

          const fieldLabel =
            HISTORY_FIELD_LABELS[entry.field as keyof typeof HISTORY_FIELD_LABELS] ?? entry.field;
          const oldValue = humanize(entry.oldValue);
          const nextValue = humanize(entry.newValue);

          return (
            <li key={entry.id} className="relative text-xs">
              <span className="absolute -left-[1.6875rem] top-1 size-2.5 rounded-full bg-background border-2 border-border" />
              <div className="text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">{authorName}</span>
                {` ${copy.tickets.history.changed} `}
                <span className="font-medium text-foreground">{fieldLabel}</span>
                {` ${copy.tickets.history.from} `}
                <span className="font-medium text-foreground">{oldValue}</span>
                {` ${copy.tickets.history.to} `}
                <span className="font-medium text-foreground">{nextValue}</span>
                <TimeAgo date={entry.createdAt} />
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

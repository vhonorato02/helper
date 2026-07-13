'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Archive,
  CheckCircle2,
  Loader2,
  PauseCircle,
  Pencil,
  PlayCircle,
  RotateCcw,
  Rocket,
  Settings2,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { deleteTicket, updateTicketField, updateTicketStatus } from '@/actions/tickets';
import { cn } from '@/lib/utils';
import { copy } from '@/lib/copy';
import { DATE_FORMATS, formatPtBrDate } from '@/lib/format';
import { PRIORITY_LABELS, PRIORITY_ORDER, STATUS_TRANSITIONS } from '@/lib/constants';
import { isEligibleAssigneeForArea } from '@/lib/assignment';
import type { Ticket, User } from '@/db/schema';
import { EditTicketDialog } from './edit-ticket-dialog';
import { TicketReminderDialog } from './ticket-reminder-dialog';

interface TicketActionsProps {
  ticket: Ticket & {
    author: { id: string; displayName: string; username: string } | null;
    assignee: { id: string; displayName: string; username: string } | null;
  };
  users: Pick<User, 'id' | 'displayName' | 'role' | 'area'>[];
  currentUserId: string;
  currentUserIsAdmin: boolean;
}

interface ActionMeta {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'default' | 'outline' | 'ghost';
  confirm?: { title: string; description: string };
}

const STATUS_ACTIONS: Record<Ticket['status'], ActionMeta> = {
  aberto: {
    label: copy.tickets.detail.statusActions.aberto,
    icon: RotateCcw,
    variant: 'outline',
  },
  em_andamento: {
    label: copy.tickets.detail.statusActions.em_andamento,
    icon: PlayCircle,
    variant: 'outline',
  },
  aguardando: {
    label: copy.tickets.detail.statusActions.aguardando,
    icon: PauseCircle,
    variant: 'outline',
  },
  resolvido: {
    label: copy.tickets.detail.statusActions.resolvido,
    icon: CheckCircle2,
    variant: 'default',
  },
  arquivado: {
    label: copy.tickets.detail.statusActions.arquivado,
    icon: Archive,
    variant: 'ghost',
    confirm: {
      title: copy.tickets.detail.archivedConfirmTitle,
      description: copy.tickets.detail.archivedConfirmDescription,
    },
  },
};

export function TicketActions({
  ticket,
  users,
  currentUserId,
  currentUserIsAdmin,
}: TicketActionsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [pendingStatus, setPendingStatus] = useState<Ticket['status'] | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<Ticket['status'] | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const performStatusChange = (newStatus: Ticket['status']) => {
    setPendingStatus(newStatus);
    startTransition(async () => {
      const result = await updateTicketStatus(ticket.code, newStatus);
      setPendingStatus(null);
      if (result && 'error' in result) {
        toast.error(result.error);
        return;
      }

      toast.success(copy.tickets.detail.statusUpdated(newStatus));
      router.refresh();
    });
  };

  const handleStatusChange = (newStatus: Ticket['status']) => {
    const meta = STATUS_ACTIONS[newStatus];
    if (meta.confirm) {
      setConfirmStatus(newStatus);
      return;
    }
    performStatusChange(newStatus);
  };

  const handleAssigneeChange = (userId: string) => {
    startTransition(async () => {
      const result = await updateTicketField(
        ticket.code,
        'assigneeId',
        userId === 'none' ? null : userId,
      );
      if (result && 'error' in result) {
        toast.error(result.error);
        return;
      }

      const newAssignee = users.find((user) => user.id === userId);
      toast.success(
        userId === 'none'
          ? copy.tickets.detail.assigneeRemoved
          : copy.tickets.detail.assigneeUpdated(newAssignee?.displayName ?? copy.users.roles.user),
      );
      router.refresh();
    });
  };

  const handleTakeAndStart = () => {
    if (!currentUserId) return;

    startTransition(async () => {
      const assignResult = await updateTicketField(ticket.code, 'assigneeId', currentUserId);
      if (assignResult && 'error' in assignResult) {
        toast.error(assignResult.error);
        return;
      }

      const statusResult = await updateTicketStatus(ticket.code, 'em_andamento');
      if (statusResult && 'error' in statusResult) {
        toast.error(statusResult.error);
        router.refresh();
        return;
      }

      toast.success(copy.tickets.detail.takeAndStartDone);
      router.refresh();
    });
  };

  const handlePriorityChange = (priority: string) => {
    startTransition(async () => {
      const result = await updateTicketField(ticket.code, 'priority', priority);
      if (result && 'error' in result) {
        toast.error(result.error);
        return;
      }

      toast.success(copy.tickets.detail.priorityUpdated);
      router.refresh();
    });
  };

  const handleDeleteTicket = () => {
    startTransition(async () => {
      const result = await deleteTicket(ticket.code);
      if (result && 'error' in result) {
        toast.error(result.error);
        return;
      }

      toast.success(copy.tickets.detail.ticketDeleted(ticket.code));
      router.push('/tickets');
      router.refresh();
    });
  };

  const handleEditOpenChange = (open: boolean) => {
    setEditOpen(open);
    if (!open && searchParams.get('edit') === '1') {
      router.replace(`/tickets/${ticket.code}`, { scroll: false });
    }
  };

  const nextStatuses = STATUS_TRANSITIONS[ticket.status] as readonly Ticket['status'][];
  const confirmMeta = confirmStatus ? STATUS_ACTIONS[confirmStatus] : null;
  const eligibleUsers = users.filter((user) => isEligibleAssigneeForArea(user, ticket.area));
  const currentUserCanTake = eligibleUsers.some((user) => user.id === currentUserId);

  useEffect(() => {
    if (searchParams.get('edit') === '1') setEditOpen(true);
  }, [searchParams]);

  return (
    <>
      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="surface-elevated rounded-lg p-4 space-y-4">
          <h3 className="section-label flex items-center gap-1.5">
            <Settings2 className="size-3.5" />
            {copy.tickets.detail.actionsTitle}
          </h3>

          <Button
            variant="outline"
            size="sm"
            className="h-9 w-full justify-start text-xs"
            disabled={isPending}
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-3.5" />
            {copy.tickets.detail.editDetails}
          </Button>

          <TicketReminderDialog ticketCode={ticket.code} />

          {ticket.status === 'aberto' && ticket.assigneeId !== currentUserId && currentUserCanTake && (
            <Button
              variant="default"
              size="sm"
              className="h-9 w-full justify-start text-xs"
              disabled={isPending || !currentUserId}
              onClick={handleTakeAndStart}
            >
              <Rocket className="size-3.5" />
              {copy.tickets.detail.takeAndStart}
            </Button>
          )}

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {copy.tickets.detail.statusTitle}
            </p>
            <div className="flex flex-col gap-1.5">
              {nextStatuses.map((status) => {
                const meta = STATUS_ACTIONS[status];
                const Icon = meta.icon;
                const isLoading = pendingStatus === status;
                return (
                  <Button
                    key={status}
                    variant={meta.variant}
                    size="sm"
                    className={cn(
                      'h-9 justify-start text-xs',
                      meta.variant === 'ghost' && 'text-muted-foreground',
                    )}
                    disabled={isPending}
                    onClick={() => handleStatusChange(status)}
                  >
                    {isLoading ? <Loader2 className="animate-spin" /> : <Icon />}
                    {meta.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-border/60" />

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {copy.tickets.detail.assigneeTitle}
            </p>
            <Select
              value={ticket.assigneeId ?? 'none'}
              onValueChange={handleAssigneeChange}
              disabled={isPending}
            >
              <SelectTrigger className="h-9 text-xs" aria-label="Alterar responsável da demanda">
                <SelectValue placeholder={copy.tickets.detail.noAssignee} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{copy.tickets.detail.noAssignee}</SelectItem>
                {eligibleUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {ticket.assigneeId !== currentUserId && currentUserCanTake && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-full gap-1.5 text-xs text-muted-foreground"
                disabled={isPending || !currentUserId}
                onClick={() => handleAssigneeChange(currentUserId)}
              >
                <UserCheck className="size-3.5" />
                {copy.tickets.detail.assignToMe}
              </Button>
            )}
          </div>

          <div className="h-px bg-border/60" />

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {copy.tickets.detail.priorityTitle}
            </p>
            <Select
              value={ticket.priority}
              onValueChange={handlePriorityChange}
              disabled={isPending}
            >
              <SelectTrigger className="h-9 text-xs" aria-label="Alterar prioridade da demanda">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_ORDER.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {PRIORITY_LABELS[priority]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {currentUserIsAdmin && (
            <>
              <div className="h-px bg-border/60" />
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-full justify-start text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={isPending}
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-3.5" />
                {copy.tickets.detail.deleteTicket}
              </Button>
            </>
          )}
        </div>

        <div className="surface-elevated rounded-lg p-4 space-y-2.5 text-xs">
          <h3 className="section-label mb-3">
            {copy.tickets.detail.metaTitle}
          </h3>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">{copy.tickets.detail.openedBy}</span>
            <span className="font-medium text-right truncate">
              {ticket.author?.displayName ?? copy.common.removedUser}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">{copy.tickets.detail.updatedAt}</span>
            <span className="font-medium text-right">
              {formatPtBrDate(ticket.updatedAt, DATE_FORMATS.tableCreated)}
            </span>
          </div>
          {ticket.assignee && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">{copy.tickets.detail.assigneeTitle}</span>
              <span className="font-medium text-right truncate">{ticket.assignee.displayName}</span>
            </div>
          )}
          {ticket.dueDate && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">{copy.tickets.form.fields.dueDate}</span>
              <span className="font-medium text-right">
                {formatPtBrDate(ticket.dueDate, DATE_FORMATS.tableCreated)}
              </span>
            </div>
          )}
          {ticket.resolvedAt && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">{copy.tickets.detail.resolvedAt}</span>
              <span className="font-medium text-right">
                {formatPtBrDate(ticket.resolvedAt, DATE_FORMATS.tableCreated)}
              </span>
            </div>
          )}
        </div>
      </aside>

      <ConfirmDialog
        open={!!confirmStatus}
        onOpenChange={(open) => !open && setConfirmStatus(null)}
        title={confirmMeta?.confirm?.title ?? ''}
        description={confirmMeta?.confirm?.description ?? ''}
        confirmLabel={confirmMeta?.label ?? copy.common.confirm}
        variant={confirmStatus === 'arquivado' ? 'destructive' : 'default'}
        onConfirm={() => {
          if (confirmStatus) performStatusChange(confirmStatus);
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={copy.tickets.detail.deleteTicketTitle(ticket.code)}
        description={copy.tickets.detail.deleteTicketDescription}
        confirmLabel={copy.tickets.detail.deleteTicket}
        variant="destructive"
        onConfirm={handleDeleteTicket}
      />

      <EditTicketDialog open={editOpen} onOpenChange={handleEditOpenChange} ticket={ticket} />
    </>
  );
}

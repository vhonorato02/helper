'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Clock,
  Loader2,
  MapPin,
  Megaphone,
  Pencil,
  Plus,
  Send,
  Trash2,
  Users,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { RecordingFormDialog } from './recording-form';
import { copy } from '@/lib/copy';
import { cn } from '@/lib/utils';
import { RECORDING_STATUS_META, RECORDING_STATUS_ORDER } from '@/lib/constants';
import { deleteRecording, setRecordingStatus } from '@/actions/recordings';
import type { Recording } from '@/db/schema';

export type RecordingRow = {
  id: string;
  title: string;
  pauta: string | null;
  scheduledDate: Date;
  durationMinutes: number | null;
  location: string | null;
  participants: string | null;
  equipment: string | null;
  publishChannel: string | null;
  responsibleId: string | null;
  responsibleName: string | null;
  authorName: string | null;
  notes: string | null;
  status: Recording['status'];
};

const statusBadgeVariant: Record<
  Recording['status'],
  'secondary' | 'default' | 'success' | 'outline'
> = {
  planejada: 'secondary',
  confirmada: 'default',
  gravada: 'success',
  publicada: 'success',
  cancelada: 'outline',
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

interface RecordingItemProps {
  recording: RecordingRow;
  users: { id: string; displayName: string }[];
}

export function RecordingItem({ recording, users }: RecordingItemProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleStatus = (next: Recording['status']) => {
    if (next === recording.status) return;
    startTransition(async () => {
      const result = await setRecordingStatus(recording.id, next);
      if (!result || 'error' in result) {
        toast.error(result?.error ?? copy.validation.invalidData);
        return;
      }
      toast.success(copy.marketing.recordings.statusChanged);
      router.refresh();
    });
  };

  const handleDelete = async () => {
    const result = await deleteRecording(recording.id);
    if (result && 'error' in result) {
      toast.error(result.error);
      return;
    }
    toast.success(copy.marketing.recordings.deleted);
    router.refresh();
  };

  const dim = recording.status === 'cancelada' || recording.status === 'publicada';

  return (
    <>
      <div
        className={cn(
          'surface-elevated rounded-xl p-4 transition-all',
          dim && 'opacity-70',
        )}
      >
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Video className="size-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold leading-snug">{recording.title}</p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    aria-label="Mudar status"
                    disabled={isPending}
                  >
                    <Badge variant={statusBadgeVariant[recording.status]} className="cursor-pointer">
                      {RECORDING_STATUS_META[recording.status].label}
                    </Badge>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {RECORDING_STATUS_ORDER.map((s) => (
                    <DropdownMenuItem
                      key={s}
                      onSelect={() => handleStatus(s)}
                      disabled={s === recording.status}
                    >
                      {RECORDING_STATUS_META[s].label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {dateFormatter.format(new Date(recording.scheduledDate))}
                {recording.durationMinutes ? ` · ${recording.durationMinutes} min` : ''}
              </span>
              {recording.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" />
                  {recording.location}
                </span>
              )}
              {recording.publishChannel && (
                <span className="flex items-center gap-1">
                  <Send className="size-3" />
                  {recording.publishChannel}
                </span>
              )}
              {recording.responsibleName && (
                <span className="flex items-center gap-1">
                  <Users className="size-3" />
                  {recording.responsibleName}
                </span>
              )}
            </div>

            {recording.pauta && (
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-3">
                {recording.pauta}
              </p>
            )}

            {(recording.equipment || recording.participants) && (
              <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                {recording.participants && (
                  <span>
                    <strong className="font-medium text-foreground/80">Participantes: </strong>
                    {recording.participants}
                  </span>
                )}
                {recording.equipment && (
                  <span>
                    <strong className="font-medium text-foreground/80">Equipamento: </strong>
                    {recording.equipment}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {isPending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              onClick={() => setEditOpen(true)}
              title={copy.common.edit}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
              title={copy.common.delete}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <RecordingFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={recording}
        users={users}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={copy.marketing.recordings.deleteTitle}
        description={copy.marketing.recordings.deleteDescription}
        confirmLabel={copy.common.delete}
        onConfirm={handleDelete}
        variant="destructive"
      />
    </>
  );
}

interface NewRecordingButtonProps {
  users: { id: string; displayName: string }[];
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm';
  withIcon?: boolean;
}

export function NewRecordingButton({
  users,
  variant = 'default',
  size = 'default',
  withIcon = true,
}: NewRecordingButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} variant={variant} size={size}>
        {withIcon ? <Plus className="size-4" /> : <Megaphone className="size-4" />}
        {copy.marketing.recordings.new}
      </Button>
      <RecordingFormDialog open={open} onOpenChange={setOpen} users={users} />
    </>
  );
}

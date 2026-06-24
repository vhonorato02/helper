'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Video } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { copy } from '@/lib/copy';
import { APP_TIMEZONE } from '@/lib/timezone';
import { createRecording, updateRecording } from '@/actions/recordings';
import type { Recording } from '@/db/schema';

type RecordingRow = {
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
  notes: string | null;
  status: Recording['status'];
};

interface RecordingFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: RecordingRow | null;
  users: { id: string; displayName: string }[];
}

function formatDatetimeLocal(date: Date) {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}T${value.hour}:${value.minute}`;
}

export function RecordingFormDialog({
  open,
  onOpenChange,
  initial,
  users,
}: RecordingFormDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [responsible, setResponsible] = useState<string>(initial?.responsibleId ?? '');

  const isEdit = !!initial;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (responsible && responsible !== 'none') formData.set('responsibleId', responsible);
    else formData.delete('responsibleId');

    startTransition(async () => {
      try {
        const result = isEdit
          ? await updateRecording(initial.id, formData)
          : await createRecording(formData);

        if (result && 'error' in result) {
          toast.error(result.error);
          return;
        }

        toast.success(isEdit ? copy.marketing.recordings.updated : copy.marketing.recordings.created);
        onOpenChange(false);
        router.refresh();
      } catch {
        toast.error(copy.validation.serverError);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && onOpenChange(v)}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <Video className="size-4 text-primary" />
            </div>
            <div>
              <DialogTitle>
                {isEdit
                  ? copy.marketing.recordings.editTitle
                  : copy.marketing.recordings.createTitle}
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                {isEdit ? initial.title : copy.marketing.recordings.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rec-title">{copy.marketing.recordings.form.title}</Label>
            <Input
              id="rec-title"
              name="title"
              placeholder={copy.marketing.recordings.form.titlePlaceholder}
              defaultValue={initial?.title}
              maxLength={120}
              required
              disabled={isPending}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rec-date">{copy.marketing.recordings.form.scheduledDate}</Label>
              <Input
                id="rec-date"
                name="scheduledDate"
                type="datetime-local"
                defaultValue={initial ? formatDatetimeLocal(new Date(initial.scheduledDate)) : ''}
                required
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rec-duration">{copy.marketing.recordings.form.duration}</Label>
              <Input
                id="rec-duration"
                name="durationMinutes"
                type="number"
                min={0}
                max={720}
                placeholder={copy.marketing.recordings.form.durationPlaceholder}
                defaultValue={initial?.durationMinutes ?? ''}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rec-pauta">{copy.marketing.recordings.form.pauta}</Label>
            <Textarea
              id="rec-pauta"
              name="pauta"
              placeholder={copy.marketing.recordings.form.pautaPlaceholder}
              defaultValue={initial?.pauta ?? ''}
              className="min-h-[90px]"
              disabled={isPending}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rec-location">{copy.marketing.recordings.form.location}</Label>
              <Input
                id="rec-location"
                name="location"
                placeholder={copy.marketing.recordings.form.locationPlaceholder}
                defaultValue={initial?.location ?? ''}
                maxLength={120}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-channel">{copy.marketing.recordings.form.publishChannel}</Label>
              <Input
                id="rec-channel"
                name="publishChannel"
                placeholder={copy.marketing.recordings.form.publishChannelPlaceholder}
                defaultValue={initial?.publishChannel ?? ''}
                maxLength={120}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rec-participants">{copy.marketing.recordings.form.participants}</Label>
            <Input
              id="rec-participants"
              name="participants"
              placeholder={copy.marketing.recordings.form.participantsPlaceholder}
              defaultValue={initial?.participants ?? ''}
              maxLength={500}
              disabled={isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rec-equipment">{copy.marketing.recordings.form.equipment}</Label>
            <Input
              id="rec-equipment"
              name="equipment"
              placeholder={copy.marketing.recordings.form.equipmentPlaceholder}
              defaultValue={initial?.equipment ?? ''}
              maxLength={500}
              disabled={isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rec-responsible">{copy.marketing.recordings.form.responsible}</Label>
            <Select
              value={responsible || 'none'}
              onValueChange={(v) => setResponsible(v === 'none' ? '' : v)}
              disabled={isPending}
            >
              <SelectTrigger id="rec-responsible">
                <SelectValue placeholder={copy.marketing.recordings.form.responsiblePlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  {copy.marketing.recordings.form.responsiblePlaceholder}
                </SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rec-notes">{copy.marketing.recordings.form.notes}</Label>
            <Textarea
              id="rec-notes"
              name="notes"
              placeholder={copy.marketing.recordings.form.notesPlaceholder}
              defaultValue={initial?.notes ?? ''}
              className="min-h-[60px]"
              disabled={isPending}
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {copy.common.cancel}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              {isPending ? 'Salvando...' : copy.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

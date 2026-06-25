'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlarmClock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
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
import { createTicketReminder } from '@/actions/ticket-reminders';
import { copy } from '@/lib/copy';

function defaultDateTimeLocal() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function TicketReminderDialog({ ticketCode }: { ticketCode: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dateValue, setDateValue] = useState(defaultDateTimeLocal);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createTicketReminder(ticketCode, formData);
      if (result && 'error' in result) {
        toast.error(result.error);
        return;
      }
      toast.success('Lembrete criado na agenda.');
      setOpen(false);
      setDateValue(defaultDateTimeLocal());
      router.refresh();
    });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-9 w-full justify-start text-xs"
        onClick={() => setOpen(true)}
      >
        <AlarmClock className="size-3.5" />
        Criar lembrete
      </Button>

      <Dialog open={open} onOpenChange={(value) => !isPending && setOpen(value)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <AlarmClock className="size-4 text-primary" />
              </div>
              <div>
                <DialogTitle>Lembrete do ticket</DialogTitle>
                <p className="mt-0.5 text-sm text-muted-foreground">{ticketCode}</p>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ticket-reminder-date">Quando lembrar</Label>
              <Input
                id="ticket-reminder-date"
                name="scheduledDate"
                type="datetime-local"
                value={dateValue}
                onChange={(event) => setDateValue(event.target.value)}
                required
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ticket-reminder-lead">Avisar</Label>
              <Select name="reminderMinutesBefore" defaultValue="10" disabled={isPending}>
                <SelectTrigger id="ticket-reminder-lead">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Na hora</SelectItem>
                  <SelectItem value="5">5 minutos antes</SelectItem>
                  <SelectItem value="10">10 minutos antes</SelectItem>
                  <SelectItem value="30">30 minutos antes</SelectItem>
                  <SelectItem value="60">1 hora antes</SelectItem>
                  <SelectItem value="1440">1 dia antes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ticket-reminder-note">Nota</Label>
              <Textarea
                id="ticket-reminder-note"
                name="note"
                placeholder="Ex: cobrar retorno, testar projetor, confirmar gravação..."
                className="min-h-[80px]"
                disabled={isPending}
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setOpen(false)}
              >
                {copy.common.cancel}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="animate-spin" />}
                Criar lembrete
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

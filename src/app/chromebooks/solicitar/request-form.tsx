'use client';

import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { createPublicChromebookBooking } from '@/actions/chromebooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getHolidaySchedulingNotice } from '@/lib/holidays';

export function PublicChromebookRequestForm({ totalChromebooks }: { totalChromebooks: number }) {
  const formRef = useRef<HTMLFormElement>(null);
  const submitLockRef = useRef(false);
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState('');
  const [success, setSuccess] = useState('');
  const holidayNotice = getHolidaySchedulingNotice(date);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    const formData = new FormData(event.currentTarget);
    setSuccess('');

    startTransition(async () => {
      const result = await createPublicChromebookBooking(formData);
      submitLockRef.current = false;
      if (result && 'error' in result) {
        toast.error(result.error);
        return;
      }

      const protocol = result?.protocol ? ` Protocolo: ${result.protocol}.` : '';
      setSuccess(`Solicitação registrada.${protocol} A equipe interna acompanhará o agendamento.`);
      toast.success(result?.protocol ? `Solicitação ${result.protocol} registrada.` : 'Solicitação registrada.');
      formRef.current?.reset();
      setDate('');
    });
  };

  return (
    <section className="surface-elevated rounded-xl p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Dados do agendamento</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Total configurado: {totalChromebooks} Chromebook(s).
          </p>
        </div>
      </div>

      <form ref={formRef} onSubmit={submit} className="space-y-4">
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="pointer-events-none absolute -left-[9999px] h-px w-px opacity-0"
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="public-chromebook-date">Data</Label>
            <Input
              id="public-chromebook-date"
              name="date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
              disabled={isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="public-chromebook-start">Início</Label>
            <Input id="public-chromebook-start" name="startTime" type="time" required disabled={isPending} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="public-chromebook-end">Término</Label>
            <Input id="public-chromebook-end" name="endTime" type="time" required disabled={isPending} />
          </div>
        </div>

        {holidayNotice && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-500/25 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>{holidayNotice.message}</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
          <div className="space-y-1.5">
            <Label htmlFor="public-chromebook-room">Sala solicitante</Label>
            <Input
              id="public-chromebook-room"
              name="room"
              placeholder="Ex: Sala 12"
              maxLength={80}
              required
              disabled={isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="public-chromebook-quantity">Quantidade</Label>
            <Input
              id="public-chromebook-quantity"
              name="quantity"
              type="number"
              min={1}
              max={totalChromebooks}
              defaultValue={1}
              required
              disabled={isPending}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="public-chromebook-requester">Nome do solicitante</Label>
          <Input
            id="public-chromebook-requester"
            name="requesterName"
            placeholder="Nome e sobrenome"
            maxLength={120}
            required
            disabled={isPending}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="public-chromebook-contact">Contato</Label>
          <Input
            id="public-chromebook-contact"
            name="requesterContact"
            placeholder="E-mail ou telefone"
            maxLength={120}
            disabled={isPending}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="public-chromebook-notes">Observações</Label>
          <Textarea
            id="public-chromebook-notes"
            name="notes"
            placeholder="Turma, atividade, necessidade especial ou contato."
            className="min-h-[100px]"
            maxLength={1000}
            disabled={isPending}
          />
        </div>

        {success && (
          <div role="status" className="flex items-start gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-700 ring-1 ring-inset ring-green-500/25 dark:text-green-300">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <p>{success}</p>
          </div>
        )}

        <Button type="submit" className="w-full sm:w-auto" disabled={isPending}>
          {isPending && <Loader2 className="animate-spin" />}
          Solicitar agendamento
        </Button>
      </form>
    </section>
  );
}

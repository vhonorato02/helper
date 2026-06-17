'use client';

import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { createPublicChromebookBooking } from '@/actions/chromebooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { combineDateTimeInSaoPaulo, dateInputInSaoPaulo } from '@/lib/chromebooks';
import { getHolidaySchedulingNotice } from '@/lib/holidays';
import { validatePublicContact } from '@/lib/public-requests';

const MIN_BOOKING_DURATION_MINUTES = 15;
const MAX_BOOKING_DURATION_MINUTES = 8 * 60;
const MIN_BOOKING_LEAD_MS = 60 * 60 * 1000;

function minutesFromTime(value: string) {
  const [hours, minutes] = value.split(':').map((part) => Number.parseInt(part, 10));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function validateLocalPeriod(date: string, startTime: string, endTime: string) {
  if (!date || !startTime || !endTime) return 'Preencha data, início e término.';
  const start = minutesFromTime(startTime);
  const end = minutesFromTime(endTime);
  if (start === null || end === null || end <= start) {
    return 'O horário de término precisa ser maior que o início.';
  }
  const duration = end - start;
  if (duration < MIN_BOOKING_DURATION_MINUTES) return 'A reserva precisa ter pelo menos 15 minutos.';
  if (duration > MAX_BOOKING_DURATION_MINUTES) return 'A reserva pode ter no máximo 8 horas.';

  const startAt = combineDateTimeInSaoPaulo(date, startTime);
  if (Number.isNaN(startAt.getTime())) return 'Informe uma data e horário válidos.';
  const now = Date.now();
  if (startAt.getTime() < now) {
    return 'Não é possível reservar Chromebooks para um horário que já passou.';
  }
  if (startAt.getTime() < now + MIN_BOOKING_LEAD_MS) {
    return 'Solicite a reserva com pelo menos 1 hora de antecedência.';
  }
  return '';
}

export function PublicChromebookRequestForm({ totalChromebooks }: { totalChromebooks: number }) {
  const formRef = useRef<HTMLFormElement>(null);
  const submitLockRef = useRef(false);
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [success, setSuccess] = useState('');
  const [formError, setFormError] = useState('');
  const [notesLength, setNotesLength] = useState(0);
  const holidayNotice = getHolidaySchedulingNotice(date);
  const minDate = dateInputInSaoPaulo(new Date());

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    const formData = new FormData(event.currentTarget);
    setSuccess('');
    setFormError('');

    const contact = validatePublicContact(String(formData.get('requesterContact') ?? ''));
    if (!contact.ok) {
      submitLockRef.current = false;
      setFormError(contact.error);
      return;
    }

    const localPeriodError = validateLocalPeriod(date, startTime, endTime);
    if (localPeriodError) {
      submitLockRef.current = false;
      setFormError(localPeriodError);
      return;
    }

    startTransition(async () => {
      const result = await createPublicChromebookBooking(formData);
      submitLockRef.current = false;
      if (result && 'error' in result) {
        const message = result.error ?? 'Não foi possível registrar a solicitação.';
        setFormError(message);
        toast.error(message);
        return;
      }

      const protocol = result?.protocol ? ` Protocolo: ${result.protocol}.` : '';
      setSuccess(`Solicitação registrada.${protocol} Guarde esse protocolo para falar com a equipe.`);
      toast.success(result?.protocol ? `Solicitação ${result.protocol} registrada.` : 'Solicitação registrada.');
      formRef.current?.reset();
      setDate('');
      setStartTime('');
      setEndTime('');
      setNotesLength(0);
    });
  };

  return (
    <section className="surface-elevated rounded-lg p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Dados do agendamento</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Total configurado: {totalChromebooks} Chromebook(s).
          </p>
        </div>
      </div>

      <form ref={formRef} onSubmit={submit} noValidate className="space-y-4">
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
              min={minDate}
              onChange={(event) => setDate(event.target.value)}
              required
              disabled={isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="public-chromebook-start">Início</Label>
            <Input
              id="public-chromebook-start"
              name="startTime"
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              required
              disabled={isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="public-chromebook-end">Término</Label>
            <Input
              id="public-chromebook-end"
              name="endTime"
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              required
              disabled={isPending}
            />
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-3">
            Mínimo de 15 minutos e antecedência de 1 hora. A disponibilidade é revalidada antes de salvar.
          </p>
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
            minLength={3}
            maxLength={120}
            required
            aria-describedby={
              formError
                ? 'public-chromebook-contact-help public-chromebook-form-error'
                : 'public-chromebook-contact-help'
            }
            disabled={isPending}
          />
          <p id="public-chromebook-contact-help" className="text-xs text-muted-foreground">
            Obrigatório para confirmar detalhes, avisar conflito e devolver o protocolo.
          </p>
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
            onChange={(event) => setNotesLength(event.currentTarget.value.length)}
          />
          <div className="flex justify-end text-xs text-muted-foreground">
            <span className="tabular-nums">{notesLength}/1000</span>
          </div>
        </div>

        {formError && (
          <div
            id="public-chromebook-form-error"
            role="alert"
            className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive ring-1 ring-inset ring-destructive/20"
          >
            {formError}
          </div>
        )}

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

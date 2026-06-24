'use client';

import { useRef, useState, useTransition } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createPublicRequest } from '@/actions/public-requests';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { validatePublicContact, validatePublicRequestSchedule } from '@/lib/public-requests';

type PublicKind = 'ti' | 'midia' | 'arte' | 'cobertura' | 'outra';

interface PublicRequestFormProps {
  kind: PublicKind;
  titleLabel: string;
  titlePlaceholder: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  channelLabel?: string;
  channelPlaceholder?: string;
  showSchedule?: boolean;
}

export function PublicRequestForm({
  kind,
  titleLabel,
  titlePlaceholder,
  descriptionLabel,
  descriptionPlaceholder,
  channelLabel,
  channelPlaceholder,
  showSchedule = false,
}: PublicRequestFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const submitLockRef = useRef(false);
  const [isPending, startTransition] = useTransition();
  const [protocol, setProtocol] = useState('');
  const [formError, setFormError] = useState('');
  const [errorScope, setErrorScope] = useState<'contact' | 'schedule' | 'form' | ''>('');
  const [descriptionLength, setDescriptionLength] = useState(0);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setProtocol('');
    setFormError('');
    setErrorScope('');

    const formData = new FormData(event.currentTarget);
    const contact = validatePublicContact(String(formData.get('requesterContact') ?? ''));
    if (!contact.ok) {
      submitLockRef.current = false;
      setFormError(contact.error);
      setErrorScope('contact');
      return;
    }

    const schedule = validatePublicRequestSchedule({
      desiredDate: String(formData.get('desiredDate') ?? ''),
      startTime: String(formData.get('startTime') ?? ''),
      endTime: String(formData.get('endTime') ?? ''),
    });

    if (showSchedule && !schedule.ok) {
      submitLockRef.current = false;
      setFormError(schedule.error);
      setErrorScope('schedule');
      return;
    }

    startTransition(async () => {
      try {
        const result = await createPublicRequest(formData);

        if (result && 'error' in result) {
          const message = result.error ?? 'Não foi possível registrar a solicitação.';
          setFormError(message);
          setErrorScope('form');
          toast.error(message);
          return;
        }

        const nextProtocol = result?.protocol ?? '';
        setProtocol(nextProtocol);
        toast.success(nextProtocol ? `Solicitação ${nextProtocol} recebida.` : 'Solicitação recebida.');
        formRef.current?.reset();
        setDescriptionLength(0);
      } catch {
        const message = 'Não foi possível registrar a solicitação agora.';
        setFormError(message);
        setErrorScope('form');
        toast.error(message);
      } finally {
        submitLockRef.current = false;
      }
    });
  };

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      aria-busy={isPending}
      noValidate
      className="surface-elevated space-y-4 rounded-lg p-5 sm:p-6"
    >
      <input type="hidden" name="kind" value={kind} />
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="pointer-events-none absolute -left-[9999px] h-px w-px opacity-0"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="public-name">Nome do solicitante</Label>
          <Input
            id="public-name"
            name="requesterName"
            autoComplete="name"
            minLength={2}
            maxLength={120}
            required
            disabled={isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="public-contact">Contato</Label>
          <Input
            id="public-contact"
            name="requesterContact"
            placeholder="E-mail ou telefone"
            autoComplete="email"
            minLength={3}
            maxLength={120}
            required
            aria-required="true"
            aria-invalid={errorScope === 'contact'}
            aria-describedby={errorScope === 'contact' ? 'public-contact-help public-form-error' : 'public-contact-help'}
            disabled={isPending}
          />
          <p id="public-contact-help" className="text-xs text-muted-foreground">
            Obrigatório para a equipe confirmar detalhes e devolver o protocolo.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <div className="space-y-1.5">
          <Label htmlFor="public-location">Setor, turma ou local</Label>
          <Input id="public-location" name="location" maxLength={120} required disabled={isPending} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="public-priority">Urgência</Label>
          <select
            id="public-priority"
            name="priority"
            defaultValue="media"
            disabled={isPending}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="public-title">{titleLabel}</Label>
        <Input
          id="public-title"
          name="title"
          placeholder={titlePlaceholder}
          minLength={4}
          maxLength={100}
          required
          disabled={isPending}
        />
      </div>

      {showSchedule && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="public-date">Data</Label>
            <Input
              id="public-date"
              name="desiredDate"
              type="date"
              aria-invalid={errorScope === 'schedule'}
              aria-describedby={errorScope === 'schedule' ? 'public-schedule-help public-form-error' : 'public-schedule-help'}
              disabled={isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="public-start">Início</Label>
            <Input
              id="public-start"
              name="startTime"
              type="time"
              aria-invalid={errorScope === 'schedule'}
              aria-describedby={errorScope === 'schedule' ? 'public-schedule-help public-form-error' : 'public-schedule-help'}
              disabled={isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="public-end">Término</Label>
            <Input
              id="public-end"
              name="endTime"
              type="time"
              aria-invalid={errorScope === 'schedule'}
              aria-describedby={errorScope === 'schedule' ? 'public-schedule-help public-form-error' : 'public-schedule-help'}
              disabled={isPending}
            />
          </div>
          <p id="public-schedule-help" className="text-xs text-muted-foreground sm:col-span-3">
            Se informar um horário, preencha data, início e término. O término precisa ser depois do início.
          </p>
        </div>
      )}

      {channelLabel && (
        <div className="space-y-1.5">
          <Label htmlFor="public-channel">{channelLabel}</Label>
          <Input
            id="public-channel"
            name="channel"
            placeholder={channelPlaceholder}
            maxLength={160}
            disabled={isPending}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="public-description">{descriptionLabel}</Label>
        <Textarea
          id="public-description"
          name="description"
          placeholder={descriptionPlaceholder}
          className="min-h-[130px]"
          minLength={10}
          maxLength={2500}
          required
          disabled={isPending}
          onChange={(event) => setDescriptionLength(event.currentTarget.value.length)}
        />
        <div className="flex justify-between gap-3 text-xs text-muted-foreground">
          <span>Inclua contexto, prazo e responsáveis quando houver.</span>
          <span className="tabular-nums">{descriptionLength}/2500</span>
        </div>
      </div>

      {formError && (
        <div
          id="public-form-error"
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive ring-1 ring-inset ring-destructive/20"
        >
          {formError}
        </div>
      )}

      {protocol && (
        <div role="status" className="flex items-start gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-700 ring-1 ring-inset ring-green-500/25 dark:text-green-300">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p>Solicitação {protocol} recebida. Guarde esse protocolo para falar com a equipe.</p>
        </div>
      )}

      <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={isPending}>
        {isPending && <Loader2 className="animate-spin" />}
        {isPending ? 'Enviando...' : 'Enviar solicitação'}
      </Button>
    </form>
  );
}

'use client';

import { useRef, useState, useTransition } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createPublicRequest } from '@/actions/public-requests';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setProtocol('');

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createPublicRequest(formData);
      submitLockRef.current = false;

      if (result && 'error' in result) {
        toast.error(result.error);
        return;
      }

      const nextProtocol = result?.protocol ?? '';
      setProtocol(nextProtocol);
      toast.success(nextProtocol ? `Solicitação ${nextProtocol} recebida.` : 'Solicitação recebida.');
      formRef.current?.reset();
    });
  };

  return (
    <form ref={formRef} onSubmit={submit} className="surface-elevated space-y-4 rounded-xl p-5 sm:p-6">
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
          <Input id="public-name" name="requesterName" maxLength={120} required disabled={isPending} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="public-contact">Contato</Label>
          <Input
            id="public-contact"
            name="requesterContact"
            placeholder="E-mail ou telefone"
            maxLength={120}
            disabled={isPending}
          />
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
          maxLength={100}
          required
          disabled={isPending}
        />
      </div>

      {showSchedule && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="public-date">Data</Label>
            <Input id="public-date" name="desiredDate" type="date" disabled={isPending} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="public-start">Início</Label>
            <Input id="public-start" name="startTime" type="time" disabled={isPending} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="public-end">Término</Label>
            <Input id="public-end" name="endTime" type="time" disabled={isPending} />
          </div>
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
          maxLength={2500}
          required
          disabled={isPending}
        />
      </div>

      {protocol && (
        <div role="status" className="flex items-start gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-700 ring-1 ring-inset ring-green-500/25 dark:text-green-300">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p>Solicitação {protocol} recebida. A equipe interna acompanhará o pedido.</p>
        </div>
      )}

      <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={isPending}>
        {isPending && <Loader2 className="animate-spin" />}
        Enviar solicitação
      </Button>
    </form>
  );
}

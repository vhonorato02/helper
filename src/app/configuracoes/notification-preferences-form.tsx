'use client';

import { useTransition } from 'react';
import { BellRing, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  updateNotificationPreferences,
  type NotificationPreferences,
} from '@/actions/notifications';
import { Button } from '@/components/ui/button';

const OPTIONS: Array<{
  name: string;
  key: Exclude<keyof NotificationPreferences, 'reminderLeadMinutes'>;
  label: string;
  description: string;
}> = [
  {
    name: 'ticket_created',
    key: 'ticketCreated',
    label: 'Novas demandas',
    description: 'Avisos sobre demandas novas, solicitações públicas e atribuições.',
  },
  {
    name: 'ticket_status',
    key: 'ticketStatus',
    label: 'Mudanças de status',
    description: 'Avisos quando uma demanda muda de etapa ou conclusão.',
  },
  {
    name: 'comment_mention',
    key: 'commentMention',
    label: 'Comentários e menções',
    description: 'Avisos quando alguém chama sua atenção em uma conversa.',
  },
  {
    name: 'daily_digest',
    key: 'dailyDigest',
    label: 'Resumos',
    description: 'Itens agrupados por rotina, como digest diário e lembretes.',
  },
  {
    name: 'email_enabled',
    key: 'emailEnabled',
    label: 'E-mail',
    description: 'Mantém o e-mail como canal de apoio quando estiver configurado.',
  },
  {
    name: 'browser_enabled',
    key: 'browserEnabled',
    label: 'Navegador e PWA',
    description: 'Mostra alertas no computador ou no app instalado quando o Helper estiver ativo.',
  },
];

export function NotificationPreferencesForm({
  preferences,
}: {
  preferences: NotificationPreferences;
}) {
  const [isPending, startTransition] = useTransition();

  const submit = (formData: FormData) => {
    startTransition(async () => {
      const result = await updateNotificationPreferences(formData);
      const maybeError = result as { error?: string };
      if (maybeError.error) {
        toast.error(maybeError.error);
        return;
      }
      toast.success('Preferências de notificação atualizadas.');
    });
  };

  return (
    <form action={submit} className="surface-panel rounded-lg p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <BellRing className="size-4" />
        </div>
        <div>
          <h3 className="font-medium">Notificações</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Escolha quais avisos aparecem na inbox interna e nos resumos.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {OPTIONS.map((option) => (
          <label
            key={option.name}
            className="flex cursor-pointer items-start gap-3 rounded-lg border bg-card/70 p-3 transition-colors hover:bg-muted/35"
          >
            <input
              type="checkbox"
              name={option.name}
              defaultChecked={preferences[option.key]}
              className="mt-1 size-4 accent-primary"
              disabled={isPending}
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium">{option.label}</span>
              <span className="block text-xs leading-relaxed text-muted-foreground">
                {option.description}
              </span>
            </span>
          </label>
        ))}
      </div>

      <label className="mt-3 flex flex-col gap-1.5 rounded-lg border bg-card/70 p-3 text-sm sm:max-w-xs">
        <span className="font-medium">Antecedência padrão</span>
        <select
          name="reminderLeadMinutes"
          defaultValue={String(preferences.reminderLeadMinutes ?? 30)}
          disabled={isPending}
          className="h-10 rounded-md border border-input bg-card px-3 text-sm"
        >
          <option value="5">5 minutos</option>
          <option value="15">15 minutos</option>
          <option value="30">30 minutos</option>
          <option value="60">1 hora</option>
          <option value="1440">1 dia</option>
        </select>
      </label>

      <Button type="submit" className="mt-4" disabled={isPending}>
        {isPending && <Loader2 className="animate-spin" />}
        Salvar preferências
      </Button>
    </form>
  );
}

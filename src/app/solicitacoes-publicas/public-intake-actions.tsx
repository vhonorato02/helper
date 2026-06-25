'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, Play, UserRoundCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  approvePublicChromebookBooking,
  assignPublicTicketToDefault,
  startPublicTicket,
} from '@/actions/external-intake';

type TicketItem = {
  kind: 'ticket';
  code: string;
  status: 'aberto' | 'em_andamento' | 'aguardando' | 'resolvido' | 'arquivado';
  assigneeId: string | null;
};

type ChromebookItem = {
  kind: 'chromebook';
  id: string;
};

export function PublicIntakeActions({ item }: { item: TicketItem | ChromebookItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const run = (
    action: () => Promise<{ ok?: boolean; error?: string; assigneeName?: string } | void>,
    success: string,
  ) => {
    startTransition(async () => {
      const result = await action();
      if (result && 'error' in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(success);
      router.refresh();
    });
  };

  if (item.kind === 'chromebook') {
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-8 px-2.5 text-xs"
        disabled={isPending}
        onClick={() => run(() => approvePublicChromebookBooking(item.id), 'Reserva aprovada.')}
      >
        {isPending ? <Loader2 className="animate-spin" /> : <Check className="size-3.5" />}
        Aprovar
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {!item.assigneeId && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-2.5 text-xs"
          disabled={isPending}
          onClick={() => run(() => assignPublicTicketToDefault(item.code), 'Demanda atribuída.')}
        >
          {isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <UserRoundCheck className="size-3.5" />
          )}
          Atribuir
        </Button>
      )}
      {item.status !== 'em_andamento' && (
        <Button
          size="sm"
          className="h-8 px-2.5 text-xs"
          disabled={isPending}
          onClick={() => run(() => startPublicTicket(item.code), 'Triagem iniciada.')}
        >
          {isPending ? <Loader2 className="animate-spin" /> : <Play className="size-3.5" />}
          Iniciar
        </Button>
      )}
    </div>
  );
}

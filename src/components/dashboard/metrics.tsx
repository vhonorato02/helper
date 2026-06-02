import Link from 'next/link';
import { BellRing, Clock } from 'lucide-react';
import { AREA_LABELS } from '@/lib/constants';

interface ResolutionStats {
  TI: { avgHours: number; total: number };
  MKT: { avgHours: number; total: number };
  PF: { avgHours: number; total: number };
}

export function ResolutionTimeCard({ data }: { data: ResolutionStats }) {
  function fmt(hours: number) {
    if (hours < 1) return '< 1h';
    if (hours < 24) return `${Math.round(hours)}h`;
    const days = hours / 24;
    if (days < 7) return `${days.toFixed(1)}d`;
    return `${Math.round(days)}d`;
  }

  return (
    <div className="surface-elevated rounded-lg p-5">
      <div className="mb-3 flex items-center gap-2">
        <Clock className="size-4 text-primary" />
        <h3 className="font-semibold text-sm">Tempo médio de resolução</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">Últimos 30 dias</p>
      <ul className="space-y-2">
        {(['TI', 'MKT', 'PF'] as const).map((area) => (
          <li key={area} className="flex items-center justify-between text-sm">
            <span className="font-medium">{AREA_LABELS[area]}</span>
            {data[area].total === 0 ? (
              <span className="text-xs text-muted-foreground">sem dados</span>
            ) : (
              <span className="tabular-nums">
                <span className="font-bold">{fmt(data[area].avgHours)}</span>
                <span className="ml-1 text-xs text-muted-foreground">
                  · {data[area].total}
                </span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReminderChecklistCard({
  publicTickets,
  chromebookPending,
  overdue,
  waiting,
  attention,
}: {
  publicTickets: number;
  chromebookPending: number;
  overdue: number;
  waiting: number;
  attention: number;
}) {
  const rows = [
    {
      label: 'Solicitações públicas',
      value: publicTickets,
      href: '/tickets?origin=public&status=ativas',
    },
    {
      label: 'Chromebooks pendentes',
      value: chromebookPending,
      href: '/chromebooks?status=pendente',
    },
    {
      label: 'Demandas atrasadas',
      value: overdue,
      href: '/tickets?due=overdue',
    },
    {
      label: 'Aguardando retorno',
      value: waiting,
      href: '/tickets?status=aguardando',
    },
    {
      label: 'Fila de atenção',
      value: attention,
      href: '/tickets?attention=true',
    },
  ];

  return (
    <div className="surface-elevated rounded-lg p-5">
      <div className="mb-3 flex items-center gap-2">
        <BellRing className="size-4 text-primary" />
        <h3 className="font-semibold text-sm">Lembretes operacionais</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">Itens que precisam de triagem ou cobrança</p>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.label}>
            <Link
              href={row.href}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/55"
            >
              <span className="font-medium">{row.label}</span>
              <span className={row.value > 0 ? 'font-bold tabular-nums text-primary' : 'tabular-nums text-muted-foreground'}>
                {row.value}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

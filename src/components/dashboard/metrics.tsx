import { Clock, Trophy } from 'lucide-react';
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
    <div className="surface-elevated rounded-xl p-5">
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

export function TopAssigneesCard({ data }: { data: Array<{ id: string; name: string; resolved: number }> }) {
  if (data.length === 0) {
    return (
      <div className="surface-elevated rounded-xl p-5">
        <div className="mb-3 flex items-center gap-2">
          <Trophy className="size-4 text-amber-500" />
          <h3 className="font-semibold text-sm">Top resolvedores</h3>
        </div>
        <p className="text-sm text-muted-foreground">Sem resolvidas nos últimos 30 dias.</p>
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.resolved));

  return (
    <div className="surface-elevated rounded-xl p-5">
      <div className="mb-3 flex items-center gap-2">
        <Trophy className="size-4 text-amber-500" />
        <h3 className="font-semibold text-sm">Top resolvedores</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">Últimos 30 dias</p>
      <ul className="space-y-2.5">
        {data.map((person, idx) => {
          const pct = max > 0 ? (person.resolved / max) * 100 : 0;
          return (
            <li key={person.id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium truncate flex items-center gap-2">
                  <span className="text-xs text-muted-foreground tabular-nums w-4">
                    {idx + 1}.
                  </span>
                  {person.name}
                </span>
                <span className="tabular-nums text-sm font-semibold">{person.resolved}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary/60 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

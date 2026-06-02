import { AREA_LABELS } from '@/lib/constants';

interface TrendPoint {
  day: string;
  created: number;
  resolved: number;
}

interface TrendChartProps {
  data: TrendPoint[];
}

function dayLabel(iso: string) {
  const [y, m, d] = iso.split('-').map((n) => Number.parseInt(n, 10));
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/**
 * Gráfico de linhas simples em SVG puro — sem dependência.
 * Mostra criadas vs resolvidas nos últimos N dias.
 */
export function TrendChart({ data }: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="surface-elevated rounded-lg p-5 text-center text-sm text-muted-foreground">
        Sem dados ainda
      </div>
    );
  }

  const maxValue = Math.max(
    1,
    ...data.flatMap((d) => [d.created, d.resolved]),
  );
  const width = 600;
  const height = 180;
  const padding = { top: 16, right: 12, bottom: 26, left: 24 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const stepX = data.length > 1 ? chartW / (data.length - 1) : 0;

  const pointX = (i: number) => padding.left + i * stepX;
  const pointY = (v: number) => padding.top + chartH - (v / maxValue) * chartH;

  const createdPath = data
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${pointX(i)} ${pointY(p.created)}`)
    .join(' ');
  const resolvedPath = data
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${pointX(i)} ${pointY(p.resolved)}`)
    .join(' ');

  // Tick marks Y axis: 0, max/2, max
  const yTicks = [0, Math.ceil(maxValue / 2), maxValue];

  // Mostra label X a cada N pontos para não ficar denso.
  const labelStep = Math.max(1, Math.ceil(data.length / 7));

  return (
    <div className="surface-elevated rounded-lg p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-sm">Atividade nos últimos {data.length} dias</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Criadas vs resolvidas por dia</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-primary" />
            Criadas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-green-500" />
            Resolvidas
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Gráfico de tickets criados e resolvidos"
      >
        {/* Y grid */}
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={padding.left}
              y1={pointY(tick)}
              x2={width - padding.right}
              y2={pointY(tick)}
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeDasharray="2 3"
            />
            <text
              x={padding.left - 6}
              y={pointY(tick) + 3}
              fontSize={10}
              textAnchor="end"
              className="fill-muted-foreground"
            >
              {tick}
            </text>
          </g>
        ))}

        {/* X labels */}
        {data.map((p, i) =>
          i % labelStep === 0 || i === data.length - 1 ? (
            <text
              key={p.day}
              x={pointX(i)}
              y={height - padding.bottom + 14}
              fontSize={9}
              textAnchor="middle"
              className="fill-muted-foreground"
            >
              {dayLabel(p.day)}
            </text>
          ) : null,
        )}

        {/* Created line */}
        <path
          d={createdPath}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Resolved line */}
        <path
          d={resolvedPath}
          fill="none"
          stroke="oklch(0.62 0.145 154)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Dots on points */}
        {data.map((p, i) => (
          <g key={p.day}>
            <circle cx={pointX(i)} cy={pointY(p.created)} r={2.5} fill="var(--primary)" />
            <circle cx={pointX(i)} cy={pointY(p.resolved)} r={2.5} fill="oklch(0.62 0.145 154)" />
          </g>
        ))}
      </svg>
    </div>
  );
}

interface AreaDistributionProps {
  data: { TI: number; MKT: number; PF: number };
}

const AREA_COLORS: Record<'TI' | 'MKT' | 'PF', string> = {
  TI: 'var(--secondary)',
  MKT: 'var(--primary)',
  PF: 'var(--muted-foreground)',
};

export function AreaDistribution({ data }: AreaDistributionProps) {
  const total = data.TI + data.MKT + data.PF;

  if (total === 0) {
    return (
      <div className="surface-elevated rounded-lg p-5 text-center text-sm text-muted-foreground">
        Nenhuma demanda ativa
      </div>
    );
  }

  const entries: Array<{ area: 'TI' | 'MKT' | 'PF'; value: number }> = [
    { area: 'TI', value: data.TI },
    { area: 'MKT', value: data.MKT },
    { area: 'PF', value: data.PF },
  ];

  // Donut: cumulativo
  const radius = 48;
  const stroke = 16;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="surface-elevated rounded-lg p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-sm">Demandas ativas por área</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Total: {total}</p>
      </div>

      <div className="flex items-center gap-5">
        <svg width={120} height={120} viewBox="0 0 120 120" className="shrink-0">
          <circle
            cx={60}
            cy={60}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.08}
            strokeWidth={stroke}
          />
          {entries.map(({ area, value }) => {
            if (value === 0) return null;
            const fraction = value / total;
            const dash = fraction * circumference;
            const gap = circumference - dash;
            const segment = (
              <circle
                key={area}
                cx={60}
                cy={60}
                r={radius}
                fill="none"
                stroke={AREA_COLORS[area]}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 60 60)"
                strokeLinecap="butt"
              />
            );
            offset += dash;
            return segment;
          })}
          <text
            x={60}
            y={60}
            fontSize={20}
            fontWeight={700}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-foreground"
          >
            {total}
          </text>
        </svg>

        <ul className="flex-1 space-y-2">
          {entries.map(({ area, value }) => {
            const pct = total > 0 ? Math.round((value / total) * 100) : 0;
            return (
              <li key={area} className="flex items-center gap-2 text-sm">
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ background: AREA_COLORS[area] }}
                />
                <span className="font-medium">{AREA_LABELS[area]}</span>
                <span className="ml-auto tabular-nums text-muted-foreground">
                  {value} <span className="text-xs">({pct}%)</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

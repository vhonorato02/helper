import Link from 'next/link';
import { AlertTriangle, ArrowUpRight, UserRoundX, UsersRound } from 'lucide-react';
import { getTeamWorkload } from '@/actions/team';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AreaBadge } from '@/components/tickets/ticket-badge';
import { AREA_LABELS, USER_ROLE_LABELS, type Area, type UserRole } from '@/lib/constants';
import { initials } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Equipe',
};

function loadVariant(label: string): 'success' | 'warning' | 'destructive' {
  if (label === 'Carga pesada') return 'destructive';
  if (label === 'Atenção') return 'warning';
  return 'success';
}

function roleLabel(role: string | null) {
  if (!role) return 'Sem cargo';
  return USER_ROLE_LABELS[role as UserRole] ?? role;
}

export default async function TeamPage() {
  const workload = await getTeamWorkload();
  const areas = Object.entries(workload.unassignedByArea) as Array<[Area, number]>;

  return (
    <div className="space-y-6">
      <div className="page-hero flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-label">Distribuição</p>
          <h1 className="mt-1.5 flex items-center gap-2 text-2xl font-bold tracking-tight">
            <UsersRound className="size-5 text-primary" />
            Equipe
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            Carga ativa por pessoa, gargalos e demandas que ainda precisam de responsável.
          </p>
        </div>
        <div className="page-actions">
          <Button variant="outline" asChild>
            <Link href="/tickets?assigneeId=unassigned&status=ativas">
              <UserRoundX className="size-4" />
              Sem responsável
            </Link>
          </Button>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface-panel rounded-lg p-4">
          <p className="section-label">Ativas</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">{workload.totalActive}</p>
        </div>
        <div className="surface-panel rounded-lg p-4">
          <p className="section-label">Sem responsável</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">{workload.totalUnassigned}</p>
        </div>
        {areas.map(([area, total]) => (
          <Link
            key={area}
            href={`/tickets?area=${area}&assigneeId=unassigned&status=ativas`}
            className="surface-panel rounded-lg p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-3">
              <AreaBadge area={area} />
              <ArrowUpRight className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums">{total}</p>
            <p className="text-xs text-muted-foreground">sem dono em {AREA_LABELS[area]}</p>
          </Link>
        ))}
      </section>

      <section className="surface-elevated overflow-hidden rounded-lg">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Carga por pessoa</h2>
            <p className="text-xs text-muted-foreground">Ordenado por pressão operacional.</p>
          </div>
          <Badge variant="secondary">{workload.members.length} membro(s)</Badge>
        </div>

        <div className="divide-y divide-border/60">
          {workload.members.map((member) => (
            <div
              key={member.id}
              className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(15rem,1fr)_minmax(20rem,1.4fr)_auto] lg:items-center"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="size-10">
                  {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt="" />}
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {initials(member.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{member.displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {roleLabel(member.role)}
                    {member.area ? ` · ${AREA_LABELS[member.area]}` : ''}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                <div className="rounded-md bg-muted/45 px-2 py-2">
                  <p className="font-bold tabular-nums">{member.stats.active}</p>
                  <p className="text-muted-foreground">ativas</p>
                </div>
                <div className="rounded-md bg-muted/45 px-2 py-2">
                  <p className="font-bold tabular-nums">{member.stats.urgent}</p>
                  <p className="text-muted-foreground">urg.</p>
                </div>
                <div className="rounded-md bg-muted/45 px-2 py-2">
                  <p className="font-bold tabular-nums">{member.stats.overdue}</p>
                  <p className="text-muted-foreground">atr.</p>
                </div>
                <div className="rounded-md bg-muted/45 px-2 py-2">
                  <p className="font-bold tabular-nums">{member.stats.waiting}</p>
                  <p className="text-muted-foreground">aguard.</p>
                </div>
                <div className="rounded-md bg-muted/45 px-2 py-2">
                  <p className="font-bold tabular-nums">{member.stats.stale}</p>
                  <p className="text-muted-foreground">paradas</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <Badge variant={loadVariant(member.loadLabel)}>
                  {member.loadLabel}
                </Badge>
                {member.nextFocus && (
                  <Link
                    href={`/tickets/${member.nextFocus.code}`}
                    className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md border border-border/70 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:max-w-52"
                    title={member.nextFocus.title}
                  >
                    <AlertTriangle className="size-3.5 shrink-0" />
                    <span className="truncate">{member.nextFocus.code}</span>
                  </Link>
                )}
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/tickets?assigneeId=${member.id}&status=ativas`}>
                    Ver fila
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

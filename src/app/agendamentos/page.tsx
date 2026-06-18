import Link from 'next/link';
import { CalendarDays, FilterX, Inbox } from 'lucide-react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getSchedules } from '@/actions/schedules';
import { Button } from '@/components/ui/button';
import { FilterField } from '@/components/ui/filter-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AREA_OPTIONS } from '@/lib/constants';
import { copy } from '@/lib/copy';
import { appDayEnd, appDayStart } from '@/lib/timezone';
import { NewScheduleButton, ScheduleItem } from './schedule-client';
import { CalendarView } from './calendar-view';
import { ViewToggle } from './view-toggle';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Agenda',
};

function groupSchedules(schedules: Awaited<ReturnType<typeof getSchedules>>) {
  const now = new Date();
  const todayStart = appDayStart(0, now);
  const todayEnd = appDayEnd(0, now);
  const weekEnd = appDayStart(7, now);

  const today: typeof schedules = [];
  const week: typeof schedules = [];
  const future: typeof schedules = [];
  const past: typeof schedules = [];

  for (const s of schedules) {
    const d = new Date(s.scheduledDate);
    if (d < todayStart) {
      past.push(s);
    } else if (d < todayEnd) {
      today.push(s);
    } else if (d < weekEnd) {
      week.push(s);
    } else {
      future.push(s);
    }
  }

  return { today, week, future, past };
}

function ScheduleGroup({
  title,
  schedules,
}: {
  title: string;
  schedules: Awaited<ReturnType<typeof getSchedules>>;
}) {
  if (schedules.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
        {title}
      </h2>
      <div className="space-y-2.5">
        {schedules.map((s) => (
          <div key={s.id} id={`sched-${s.id}`} className="transition-shadow rounded-lg">
            <ScheduleItem
              schedule={{
                id: s.id,
                title: s.title,
                description: s.description,
                scheduledDate: s.scheduledDate,
                area: s.area,
                status: s.status,
                authorName: s.authorName,
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function AgendamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; area?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const sp = await searchParams;
  const view: 'list' | 'calendar' = sp.view === 'calendar' ? 'calendar' : 'list';
  const activeArea = sp.area ?? 'all';
  const activeStatus = sp.status ?? 'all';
  const hasActiveFilters = activeArea !== 'all' || activeStatus !== 'all';

  const allSchedules = await getSchedules({ area: activeArea, status: activeStatus });
  const { today, week, future, past } = groupSchedules(allSchedules);
  const isEmpty = allSchedules.length === 0;

  return (
    <div className="space-y-7">
      <div className="page-hero flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="size-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">{copy.agendamentos.page.title}</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{copy.agendamentos.page.description}</p>
        </div>
        <div className="page-actions sm:items-center">
          <ViewToggle current={view} />
          <NewScheduleButton />
        </div>
      </div>

      <form action="/agendamentos" className="surface-elevated rounded-lg p-3 sm:p-4">
        {view === 'calendar' && <input type="hidden" name="view" value="calendar" />}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,0.8fr)_minmax(12rem,0.8fr)_auto] lg:items-end">
          <FilterField label={copy.agendamentos.form.area} htmlFor="schedule-filter-area">
            <Select name="area" defaultValue={activeArea}>
              <SelectTrigger id="schedule-filter-area" aria-label="Filtrar agendamentos por área">
                <SelectValue placeholder={copy.agendamentos.form.areaPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as áreas</SelectItem>
                {AREA_OPTIONS.map((area) => (
                  <SelectItem key={area.value} value={area.value}>
                    {area.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Status" htmlFor="schedule-filter-status">
            <Select name="status" defaultValue={activeStatus}>
              <SelectTrigger id="schedule-filter-status" aria-label="Filtrar agendamentos por status">
                <SelectValue placeholder="Todos status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="pendente">{copy.agendamentos.status.pendente}</SelectItem>
                <SelectItem value="concluido">{copy.agendamentos.status.concluido}</SelectItem>
                <SelectItem value="cancelado">{copy.agendamentos.status.cancelado}</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row lg:col-span-1">
            <Button type="submit" variant="outline" className="w-full lg:w-auto">
              Filtrar agenda
            </Button>
            {hasActiveFilters && (
              <Button asChild type="button" variant="ghost" className="w-full text-muted-foreground lg:w-auto">
                <Link href={view === 'calendar' ? '/agendamentos?view=calendar' : '/agendamentos'}>
                  <FilterX className="size-4" />
                  Limpar
                </Link>
              </Button>
            )}
          </div>
        </div>
      </form>

      {isEmpty ? (
        <div className="surface-elevated rounded-lg py-20 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-lg bg-muted/60">
            <Inbox className="size-5 text-muted-foreground" />
          </div>
          <p className="font-semibold">
            {hasActiveFilters ? 'Nenhum agendamento encontrado com esses filtros' : copy.agendamentos.empty}
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {hasActiveFilters ? 'Ajuste os filtros ou limpe a seleção para voltar à agenda completa.' : copy.agendamentos.emptyHint}
          </p>
          {hasActiveFilters && (
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href={view === 'calendar' ? '/agendamentos?view=calendar' : '/agendamentos'}>
                Limpar filtros
              </Link>
            </Button>
          )}
        </div>
      ) : view === 'calendar' ? (
        <div className="space-y-6">
          <CalendarView schedules={allSchedules} />
          <ScheduleGroup title={copy.agendamentos.groups.today} schedules={today} />
        </div>
      ) : (
        <div className="space-y-8">
          <ScheduleGroup title={copy.agendamentos.groups.today} schedules={today} />
          <ScheduleGroup title={copy.agendamentos.groups.week} schedules={week} />
          <ScheduleGroup title={copy.agendamentos.groups.future} schedules={future} />
          <ScheduleGroup title={copy.agendamentos.groups.past} schedules={past} />
        </div>
      )}
    </div>
  );
}

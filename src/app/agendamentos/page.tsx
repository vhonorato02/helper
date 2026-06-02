import { CalendarDays, Inbox } from 'lucide-react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getSchedules } from '@/actions/schedules';
import { copy } from '@/lib/copy';
import { NewScheduleButton, ScheduleItem } from './schedule-client';
import { CalendarView } from './calendar-view';
import { ViewToggle } from './view-toggle';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Agenda',
};

function groupSchedules(schedules: Awaited<ReturnType<typeof getSchedules>>) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);

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
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const sp = await searchParams;
  const view: 'list' | 'calendar' = sp.view === 'calendar' ? 'calendar' : 'list';

  const allSchedules = await getSchedules();
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

      {isEmpty && view !== 'calendar' ? (
        <div className="surface-elevated rounded-lg py-20 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-lg bg-muted/60">
            <Inbox className="size-5 text-muted-foreground" />
          </div>
          <p className="font-semibold">{copy.agendamentos.empty}</p>
          <p className="mt-1.5 text-sm text-muted-foreground">{copy.agendamentos.emptyHint}</p>
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

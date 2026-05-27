import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CalendarRange,
  Megaphone,
  Sparkles,
  Video,
} from 'lucide-react';
import { auth } from '@/auth';
import { copy } from '@/lib/copy';
import { cn } from '@/lib/utils';
import {
  PINDAMONHANGABA_HOLIDAYS_2026,
  formatHolidaySummary,
  holidayShortLabels,
  holidayTone,
  type InstitutionalHoliday,
} from '@/lib/holidays';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AreaBadge, PriorityBadge, StatusBadge } from '@/components/tickets/ticket-badge';
import { getTickets } from '@/actions/tickets';
import { getRecordings, getRecordingStats } from '@/actions/recordings';
import { getUpcomingMarketingEvents } from '@/actions/marketing-events';
import { getActiveUsersForAssignment } from '@/actions/users';
import { NewRecordingButton, RecordingItem } from './recording-list';
import { UpcomingEventCard } from './upcoming-events';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Marketing',
};

interface MarketingStatCardProps {
  label: string;
  value: number;
  hint: string;
  icon: React.ReactNode;
  href: string;
  tone?: 'primary' | 'neutral' | 'amber' | 'emerald';
}

function StatCard({ label, value, hint, icon, href, tone = 'primary' }: MarketingStatCardProps) {
  const toneClass = {
    primary: 'bg-primary/10 text-primary ring-primary/15',
    neutral: 'bg-muted text-muted-foreground ring-border/80',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/18',
    emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/18',
  }[tone];

  return (
    <Link
      href={href}
      className="group surface-panel rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="section-label line-clamp-1">{label}</p>
          <p className="mt-2 text-[2rem] font-bold tabular-nums tracking-tight leading-none">
            {value}
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground line-clamp-1">{hint}</p>
        </div>
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset transition-all group-hover:scale-105',
            toneClass,
          )}
        >
          {icon}
        </div>
      </div>
    </Link>
  );
}

const HOLIDAY_TONE_CLASS = {
  red: 'bg-red-500/10 text-red-700 ring-red-500/25 dark:text-red-300',
  orange: 'bg-orange-500/10 text-orange-700 ring-orange-500/25 dark:text-orange-300',
  amber: 'bg-amber-500/10 text-amber-800 ring-amber-500/25 dark:text-amber-300',
  none: 'bg-muted text-muted-foreground ring-border',
} as const;

function parseInstitutionalDate(date: string) {
  return new Date(`${date}T12:00:00-03:00`);
}

function daysUntilInstitutionalDate(date: string, now: Date) {
  const target = parseInstitutionalDate(date);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.ceil((targetDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function getUpcomingInstitutionalHolidays(days: number, now = new Date()) {
  const horizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return PINDAMONHANGABA_HOLIDAYS_2026.filter((holiday) => {
    const date = parseInstitutionalDate(holiday.date);
    return date >= now && date <= horizon;
  }).sort((a, b) => a.date.localeCompare(b.date));
}

function OfficialHolidayCard({ holiday, now }: { holiday: InstitutionalHoliday; now: Date }) {
  const [year, month, day] = holiday.date.split('-');
  const tone = holidayTone(holiday);
  const days = daysUntilInstitutionalDate(holiday.date, now);

  return (
    <div className="surface-elevated rounded-xl p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold leading-snug">{holiday.name}</span>
            <Badge
              variant="outline"
              className={cn('ring-1 ring-inset text-[11px]', HOLIDAY_TONE_CLASS[tone])}
            >
              {holidayShortLabels(holiday).join(' / ')}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatHolidaySummary(holiday)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-xs font-semibold text-primary">
            {day}/{month}/{year}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {days === 0 ? 'Hoje' : days === 1 ? 'Amanhã' : `Em ${days} dias`}
          </p>
        </div>
      </div>
    </div>
  );
}

export default async function MarketingHubPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const [upcoming, recordings, recordingStats, mktTickets, activeUsers] = await Promise.all([
    getUpcomingMarketingEvents(30),
    getRecordings(),
    getRecordingStats(),
    getTickets({ area: 'MKT', status: 'ativas', sort: 'priority', page: 1 }),
    getActiveUsersForAssignment(),
  ]);

  const openMktCount = mktTickets.length;
  const now = new Date();
  const upcomingHolidays = getUpcomingInstitutionalHolidays(30, now);
  const weekRecordings = recordings.filter((r) => {
    const d = new Date(r.scheduledDate);
    const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
    return (
      d >= now &&
      d < weekEnd &&
      (r.status === 'planejada' || r.status === 'confirmada')
    );
  });

  const recentRecordings = recordings
    .filter((r) => r.status !== 'cancelada')
    .slice(0, 4);

  const upcomingTop = upcoming.slice(0, 6);

  return (
    <div className="space-y-7">
      <div className="page-hero flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Megaphone className="size-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">{copy.marketing.page.title}</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{copy.marketing.page.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button asChild variant="outline" size="sm">
            <Link href="/marketing/calendario">
              <CalendarRange className="size-4" />
              {copy.marketing.tabs.calendar}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/marketing/gravacoes">
              <Video className="size-4" />
              {copy.marketing.tabs.recordings}
            </Link>
          </Button>
          <NewRecordingButton users={activeUsers} size="sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <StatCard
          label={copy.marketing.stats.openTickets}
          value={openMktCount}
          hint={copy.marketing.stats.openTicketsHint}
          icon={<Megaphone className="size-4" />}
          href="/tickets?area=MKT&status=ativas"
          tone="primary"
        />
        <StatCard
          label={copy.marketing.stats.plannedRecordings}
          value={recordingStats.planejadas}
          hint={copy.marketing.stats.plannedRecordingsHint}
          icon={<Video className="size-4" />}
          href="/marketing/gravacoes"
          tone="neutral"
        />
        <StatCard
          label={copy.marketing.stats.weekRecordings}
          value={recordingStats.semana}
          hint={copy.marketing.stats.weekRecordingsHint}
          icon={<CalendarDays className="size-4" />}
          href="/marketing/gravacoes"
          tone="amber"
        />
        <StatCard
          label={copy.marketing.stats.upcomingEvents}
          value={upcoming.length + upcomingHolidays.length}
          hint={copy.marketing.stats.upcomingEventsHint}
          icon={<Sparkles className="size-4" />}
          href="/marketing/calendario"
          tone="emerald"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
                <Sparkles className="size-4 text-amber-500" />
                {copy.marketing.upcoming.title}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {copy.marketing.upcoming.description}
              </p>
            </div>
            <Link
              href="/marketing/calendario"
              className="text-sm text-primary hover:underline flex items-center gap-1 font-medium"
            >
              {copy.marketing.upcoming.seeAll}
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>

          {upcomingTop.length === 0 && upcomingHolidays.length === 0 ? (
            <div className="surface-elevated rounded-xl py-12 text-center">
              <p className="text-sm text-muted-foreground">{copy.marketing.upcoming.empty}</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcomingHolidays.map((holiday) => (
                <OfficialHolidayCard key={holiday.date} holiday={holiday} now={now} />
              ))}
              {upcomingTop.map((event) => (
                <UpcomingEventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
                <Video className="size-4 text-primary" />
                {copy.marketing.recordings.title}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {weekRecordings.length > 0
                  ? `${weekRecordings.length} ${weekRecordings.length === 1 ? 'gravação' : 'gravações'} nesta semana`
                  : copy.marketing.recordings.description}
              </p>
            </div>
            <Link
              href="/marketing/gravacoes"
              className="text-sm text-primary hover:underline flex items-center gap-1 font-medium"
            >
              Ver todas
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>

          {recentRecordings.length === 0 ? (
            <div className="surface-elevated rounded-xl py-12 text-center">
              <p className="text-sm font-semibold">{copy.marketing.recordings.empty}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {copy.marketing.recordings.emptyHint}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentRecordings.map((rec) => (
                <RecordingItem key={rec.id} recording={rec} users={activeUsers} />
              ))}
            </div>
          )}
        </section>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
              <Megaphone className="size-4 text-primary" />
              {copy.marketing.tickets.title}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {copy.marketing.tickets.description}
            </p>
          </div>
          <Link
            href="/tickets?area=MKT&status=ativas"
            className="text-sm text-primary hover:underline flex items-center gap-1 font-medium"
          >
            {copy.marketing.tickets.openAll}
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {mktTickets.length === 0 ? (
          <div className="surface-elevated rounded-xl py-12 text-center">
            <p className="text-sm text-muted-foreground">{copy.marketing.tickets.empty}</p>
          </div>
        ) : (
          <div className="surface-elevated overflow-hidden rounded-xl">
            <ul className="divide-y divide-border/60">
              {mktTickets.slice(0, 6).map((ticket) => (
                <li key={ticket.id}>
                  <Link
                    href={`/tickets/${ticket.code}`}
                    className="flex items-start justify-between gap-3 p-3.5 transition-all hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-primary font-medium">
                          {ticket.code}
                        </span>
                        <AreaBadge area={ticket.area} />
                      </div>
                      <p className="text-sm font-medium leading-snug line-clamp-1">
                        {ticket.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {ticket.subcategory}
                        {ticket.assigneeName ? ` · ${ticket.assigneeName}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <PriorityBadge priority={ticket.priority} />
                      <StatusBadge status={ticket.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

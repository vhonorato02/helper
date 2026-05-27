import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, CalendarRange, Lock } from 'lucide-react';
import { auth } from '@/auth';
import { copy } from '@/lib/copy';
import { getMarketingEvents } from '@/actions/marketing-events';
import { EventRow, NewEventButton } from './event-list';
import { Badge } from '@/components/ui/badge';
import {
  PINDAMONHANGABA_HOLIDAYS_2026,
  formatHolidaySummary,
  holidayShortLabels,
  holidayTone,
  type InstitutionalHoliday,
} from '@/lib/holidays';
import { cn } from '@/lib/utils';
import type { MarketingEvent } from '@/db/schema';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Calendário editorial',
};

const MONTH_LABELS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const HOLIDAY_TONE_CLASS = {
  red: 'bg-red-500/10 text-red-700 ring-red-500/25 dark:text-red-300',
  orange: 'bg-orange-500/10 text-orange-700 ring-orange-500/25 dark:text-orange-300',
  amber: 'bg-amber-500/10 text-amber-800 ring-amber-500/25 dark:text-amber-300',
  none: 'bg-muted text-muted-foreground ring-border',
} as const;

function HolidayRow({ holiday }: { holiday: InstitutionalHoliday }) {
  const [year, month, day] = holiday.date.split('-');
  const tone = holidayTone(holiday);

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-3 transition-all">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-10 shrink-0 flex-col items-center justify-center rounded-md bg-muted/50">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {MONTH_LABELS[Number(month) - 1]?.slice(0, 3)}
          </span>
          <span className="text-sm font-bold tabular-nums leading-none">{day}</span>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{holiday.name}</span>
            <Badge
              variant="outline"
              className={cn('ring-1 ring-inset text-xs', HOLIDAY_TONE_CLASS[tone])}
            >
              {holidayShortLabels(holiday).join(' / ')}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            {formatHolidaySummary(holiday)} · {day}/{month}/{year}
          </p>
          {holiday.note && (
            <p className="mt-1 text-[11px] text-muted-foreground">{holiday.note}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const canEdit = !!session.user.isAdmin;
  const events = await getMarketingEvents();

  const byMonth = new Map<number, MarketingEvent[]>();
  for (const e of events) {
    const list = byMonth.get(e.month) ?? [];
    list.push(e);
    byMonth.set(e.month, list);
  }

  const holidaysByMonth = new Map<number, InstitutionalHoliday[]>();
  for (const holiday of PINDAMONHANGABA_HOLIDAYS_2026) {
    const month = Number(holiday.date.slice(5, 7));
    const list = holidaysByMonth.get(month) ?? [];
    list.push(holiday);
    holidaysByMonth.set(month, list);
  }

  const currentMonth = new Date().getMonth() + 1;
  const isEmpty = events.length === 0 && PINDAMONHANGABA_HOLIDAYS_2026.length === 0;

  return (
    <div className="space-y-7">
      <div className="page-hero flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/marketing"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3" />
            {copy.marketing.page.title}
          </Link>
          <div className="mt-1 flex items-center gap-2">
            <CalendarRange className="size-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">
              {copy.marketing.calendar.title}
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {copy.marketing.calendar.description}
          </p>
        </div>
        {canEdit ? (
          <NewEventButton />
        ) : (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="size-3" />
            {copy.marketing.calendar.adminOnly}
          </p>
        )}
      </div>

      {isEmpty ? (
        <div className="surface-elevated rounded-xl py-20 text-center">
          <p className="font-semibold">{copy.marketing.calendar.empty}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {MONTH_LABELS.map((label, idx) => {
            const m = idx + 1;
            const items = byMonth.get(m);
            const holidays = holidaysByMonth.get(m) ?? [];
            if ((!items || items.length === 0) && holidays.length === 0) return null;

            return (
              <section key={m}>
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/80">
                    {label}
                  </h2>
                  {m === currentMonth && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                      Mês atual
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {holidays.map((holiday) => (
                    <HolidayRow key={holiday.date} holiday={holiday} />
                  ))}
                  {items?.map((event) => (
                    <EventRow key={event.id} event={event} canEdit={canEdit} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

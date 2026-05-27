'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AREA_LABELS } from '@/lib/constants';
import {
  formatHolidaySummary,
  getHolidayByDate,
  holidayShortLabels,
  holidayTone,
} from '@/lib/holidays';
import { cn } from '@/lib/utils';
import type { Schedule } from '@/db/schema';

type ScheduleRow = {
  id: string;
  title: string;
  description: string | null;
  scheduledDate: Date;
  area: Schedule['area'];
  status: Schedule['status'];
};

interface CalendarViewProps {
  schedules: ScheduleRow[];
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, n: number) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const AREA_DOT: Record<'TI' | 'MKT' | 'PF', string> = {
  TI: 'bg-secondary',
  MKT: 'bg-primary',
  PF: 'bg-muted-foreground',
};

const HOLIDAY_CELL_TONE = {
  red: 'bg-red-500/8 ring-1 ring-inset ring-red-500/20',
  orange: 'bg-orange-500/8 ring-1 ring-inset ring-orange-500/20',
  amber: 'bg-amber-500/10 ring-1 ring-inset ring-amber-500/25',
  none: '',
} as const;

const HOLIDAY_BADGE_TONE = {
  red: 'bg-red-500/10 text-red-700 dark:text-red-300 ring-red-500/25',
  orange: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-orange-500/25',
  amber: 'bg-amber-500/14 text-amber-800 dark:text-amber-300 ring-amber-500/25',
  none: '',
} as const;

export function CalendarView({ schedules }: CalendarViewProps) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const monthLabel = cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const grid = useMemo(() => {
    const first = startOfMonth(cursor);
    const startDayOfWeek = first.getDay(); // 0 = domingo
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();

    const cells: Array<{ date: Date | null; items: ScheduleRow[] }> = [];

    // Padding inicial
    for (let i = 0; i < startDayOfWeek; i += 1) {
      cells.push({ date: null, items: [] });
    }

    for (let d = 1; d <= daysInMonth; d += 1) {
      const date = new Date(cursor.getFullYear(), cursor.getMonth(), d);
      const items = schedules.filter((s) => sameDay(new Date(s.scheduledDate), date));
      cells.push({ date, items });
    }

    // Padding final pra completar 6 semanas
    while (cells.length % 7 !== 0 || cells.length < 42) {
      cells.push({ date: null, items: [] });
      if (cells.length >= 42) break;
    }

    return cells;
  }, [cursor, schedules]);

  const monthList = useMemo(
    () =>
      grid
        .filter((cell): cell is { date: Date; items: ScheduleRow[] } => Boolean(cell.date))
        .map((cell) => ({ ...cell, holiday: getHolidayByDate(cell.date) }))
        .filter((cell) => cell.items.length > 0 || cell.holiday),
    [grid],
  );

  const today = new Date();

  return (
    <div className="surface-elevated rounded-xl overflow-hidden">
      <div className="flex items-center justify-between border-b p-3">
        <Button variant="outline" size="sm" onClick={() => setCursor((c) => addMonths(c, -1))}>
          <ChevronLeft className="size-3.5" />
        </Button>
        <h3 className="font-semibold capitalize text-sm">{monthLabel}</h3>
        <Button variant="outline" size="sm" onClick={() => setCursor((c) => addMonths(c, 1))}>
          <ChevronRight className="size-3.5" />
        </Button>
      </div>

      <div className="divide-y md:hidden">
        {monthList.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Nenhum agendamento ou feriado neste mês.
          </p>
        ) : (
          monthList.map((cell) => {
            const tone = holidayTone(cell.holiday);
            return (
              <div key={cell.date.toISOString()} className="p-4">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold capitalize">
                      {cell.date.toLocaleDateString('pt-BR', {
                        weekday: 'long',
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </p>
                    {cell.holiday && (
                      <p
                        className={cn(
                          'mt-1 inline-flex rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset',
                          HOLIDAY_BADGE_TONE[tone],
                        )}
                      >
                        {formatHolidaySummary(cell.holiday)}
                      </p>
                    )}
                  </div>
                </div>
                <ul className="space-y-2">
                  {cell.items.map((item) => (
                    <li key={item.id}>
                      <Link
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          const el = document.getElementById(`sched-${item.id}`);
                          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          el?.classList.add('ring-2', 'ring-primary');
                          setTimeout(() => el?.classList.remove('ring-2', 'ring-primary'), 1500);
                        }}
                        className={cn(
                          'flex items-center gap-2 rounded-lg border bg-card/70 px-3 py-2 text-sm',
                          item.status === 'concluido' && 'line-through opacity-60',
                        )}
                      >
                        {item.area && (
                          <span className={cn('size-2 rounded-full shrink-0', AREA_DOT[item.area])} />
                        )}
                        <span className="font-mono text-xs">
                          {new Date(item.scheduledDate).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{item.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </div>

      <div className="hidden grid-cols-7 border-b md:grid">
        {WEEKDAYS.map((w) => (
          <div key={w} className="px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {w}
          </div>
        ))}
      </div>

      <div className="hidden grid-cols-7 md:grid">
        {grid.map((cell, idx) => {
          const isToday = cell.date && sameDay(cell.date, today);
          const isWeekend = cell.date && (cell.date.getDay() === 0 || cell.date.getDay() === 6);
          const holiday = cell.date ? getHolidayByDate(cell.date) : null;
          const tone = holidayTone(holiday);
          return (
            <div
              key={idx}
              className={cn(
                'min-h-[88px] border-b border-r p-1.5 last:border-r-0',
                idx % 7 === 6 && 'border-r-0',
                !cell.date && 'bg-muted/20',
                isToday && 'bg-primary/5',
                isWeekend && cell.date && 'bg-muted/10',
                holiday && HOLIDAY_CELL_TONE[tone],
              )}
            >
              {cell.date && (
                <>
                  <div
                    className={cn(
                      'text-xs font-semibold tabular-nums mb-1',
                      isToday && 'text-primary',
                    )}
                  >
                    {cell.date.getDate()}
                  </div>
                  {holiday && (
                    <div
                      title={formatHolidaySummary(holiday)}
                      className={cn(
                        'mb-1 line-clamp-2 rounded px-1 py-0.5 text-[9.5px] font-semibold leading-tight ring-1 ring-inset',
                        HOLIDAY_BADGE_TONE[tone],
                      )}
                    >
                      {holiday.name}
                      <span className="ml-1 opacity-70">
                        {holidayShortLabels(holiday).join('/')}
                      </span>
                    </div>
                  )}
                  <ul className="space-y-0.5">
                    {cell.items.slice(0, 3).map((item) => (
                      <li key={item.id}>
                        <Link
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            const el = document.getElementById(`sched-${item.id}`);
                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            el?.classList.add('ring-2', 'ring-primary');
                            setTimeout(() => el?.classList.remove('ring-2', 'ring-primary'), 1500);
                          }}
                          className={cn(
                            'flex items-center gap-1 text-[10px] truncate rounded px-1 py-0.5 hover:bg-muted',
                            item.status === 'concluido' && 'line-through opacity-50',
                          )}
                          title={item.title}
                        >
                          {item.area && (
                            <span className={cn('size-1.5 rounded-full shrink-0', AREA_DOT[item.area])} />
                          )}
                          <span className="truncate">
                            {new Date(item.scheduledDate).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            {item.title}
                          </span>
                        </Link>
                      </li>
                    ))}
                    {cell.items.length > 3 && (
                      <li className="text-[10px] text-muted-foreground px-1">
                        +{cell.items.length - 3} mais
                      </li>
                    )}
                  </ul>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 border-t px-3 py-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-secondary" /> {AREA_LABELS.TI}
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-primary" /> {AREA_LABELS.MKT}
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-muted-foreground" /> {AREA_LABELS.PF}
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-red-500/80" /> Feriado
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-amber-500/80" /> Ponto facultativo
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-amber-500/80" /> Parcial
        </span>
      </div>
    </div>
  );
}

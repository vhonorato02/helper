'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  FilterX,
  Inbox,
  Loader2,
  Search,
  UserRound,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AreaBadge, PriorityBadge, StatusBadge } from './ticket-badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AREA_OPTIONS,
  PRIORITY_LABELS,
  PRIORITY_ORDER,
  STATUS_LABELS,
  STATUS_ORDER,
} from '@/lib/constants';
import { copy } from '@/lib/copy';
import { DATE_FORMATS, daysSince, formatPtBrDate } from '@/lib/format';
import { exportTicketRows, type TicketRow } from '@/actions/tickets';

type ExportTicketRow = Awaited<ReturnType<typeof exportTicketRows>>['rows'][number];

interface Props {
  tickets: TicketRow[];
  users: { id: string; displayName: string }[];
  total: number;
  page: number;
  pageSize: number;
  currentUserId?: string;
}

function csvCell(value: string | number | null | undefined) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function downloadCSV(tickets: ExportTicketRow[]) {
  const headers = [
    copy.tickets.table.headers.code,
    copy.tickets.table.headers.area,
    copy.tickets.table.headers.title,
    copy.tickets.table.headers.subcategory,
    copy.tickets.table.headers.priority,
    copy.tickets.table.headers.status,
    copy.tickets.table.headers.assignee,
    copy.tickets.table.headers.author,
    copy.tickets.table.headers.origin,
    copy.tickets.form.fields.description,
    copy.tickets.table.headers.createdAt,
    copy.tickets.table.headers.updatedAt,
    copy.tickets.detail.resolvedAt,
  ];

  const rows = tickets.map((ticket) => [
    ticket.code,
    ticket.area,
    ticket.title,
    ticket.subcategory,
    PRIORITY_LABELS[ticket.priority],
    STATUS_LABELS[ticket.status],
    ticket.assigneeName ?? copy.tickets.table.unassigned,
    ticket.authorName ?? copy.common.removedUser,
    ticket.origin,
    ticket.description,
    formatPtBrDate(ticket.createdAt, DATE_FORMATS.csvDateTime),
    formatPtBrDate(ticket.updatedAt, DATE_FORMATS.csvDateTime),
    ticket.resolvedAt ? formatPtBrDate(ticket.resolvedAt, DATE_FORMATS.csvDateTime) : '',
  ]);

  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(';')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${copy.tickets.table.fileNamePrefix}-${formatPtBrDate(
    new Date(),
    DATE_FORMATS.csvFileDate,
  )}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function TicketTable({ tickets, users, total, page, pageSize, currentUserId = '' }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.get('search') ?? '';
  const [search, setSearch] = useState(currentSearch);
  const [isExporting, startExportTransition] = useTransition();

  useEffect(() => {
    setSearch(currentSearch);
  }, [currentSearch]);

  const pushParams = useCallback(
    (params: URLSearchParams) => {
      params.delete('page');
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router],
  );

  useEffect(() => {
    const nextSearch = search.trim();
    if (nextSearch === currentSearch) return;

    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextSearch) {
        params.set('search', nextSearch);
      } else {
        params.delete('search');
      }
      pushParams(params);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [currentSearch, pushParams, search, searchParams]);

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (key === 'sort' && value === 'created_desc') {
        params.delete(key);
      } else if (value && value !== 'all') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      pushParams(params);
    },
    [pushParams, searchParams],
  );

  const handleSearch = useCallback(
    (value: string) => {
      setSearch(value);
    },
    [],
  );

  const activeArea = searchParams.get('area') ?? 'all';
  const activeStatus = searchParams.get('status') ?? 'all';
  const activePriority = searchParams.get('priority') ?? 'all';
  const activeAssignee = searchParams.get('assigneeId') ?? 'all';
  const activeAttention = searchParams.get('attention') === 'true';
  const activeSort = searchParams.get('sort') ?? 'created_desc';
  const showingMine = !!currentUserId && activeAssignee === currentUserId;
  const hasActiveFilters =
    activeArea !== 'all' ||
    activeStatus !== 'all' ||
    activePriority !== 'all' ||
    activeAssignee !== 'all' ||
    activeAttention ||
    activeSort !== 'created_desc' ||
    !!search;

  const clearFilters = () => router.push(pathname);
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const pageStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(page * pageSize, total);

  const goToPage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage > 1) {
      params.set('page', String(nextPage));
    } else {
      params.delete('page');
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const handleExport = () => {
    startExportTransition(async () => {
      try {
        const result = await exportTicketRows({
          area: activeArea,
          status: activeStatus,
          priority: activePriority,
          assigneeId: activeAssignee,
          search: search.trim(),
          attention: activeAttention ? 'true' : undefined,
          sort: activeSort,
        });

        downloadCSV(result.rows);
        toast.success(copy.tickets.table.exportedCsv(result.rows.length));
        if (result.truncated) toast.warning(copy.tickets.table.exportLimited(result.limit));
      } catch {
        toast.error(copy.tickets.table.exportFailed);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="surface-panel rounded-lg p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={copy.tickets.table.searchPlaceholder}
              className="pl-9 pr-9"
              value={search}
              onChange={(event) => handleSearch(event.target.value)}
              id="search-input"
            />
            {search && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={copy.tickets.table.clearSearch}
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 lg:justify-end">
            <span className="text-xs tabular-nums text-muted-foreground">
              {copy.tickets.table.count(total)}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={handleExport}
              title={copy.tickets.table.exportCsv}
              aria-label={copy.tickets.table.exportCsv}
              disabled={total === 0 || isExporting}
            >
              {isExporting ? <Loader2 className="animate-spin" /> : <Download />}
            </Button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-[9rem_10rem_9rem_minmax(11rem,1fr)_auto_auto_10rem_auto]">
          <Select value={activeArea} onValueChange={(value) => updateParam('area', value)}>
            <SelectTrigger>
              <SelectValue placeholder={copy.tickets.table.headers.area} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.tickets.table.allAreas}</SelectItem>
              {AREA_OPTIONS.map((area) => (
                <SelectItem key={area.value} value={area.value}>
                  {area.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={activeStatus} onValueChange={(value) => updateParam('status', value)}>
            <SelectTrigger>
              <SelectValue placeholder={copy.tickets.table.headers.status} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.tickets.table.allStatuses}</SelectItem>
              <SelectItem value="ativas">{copy.tickets.table.activeStatuses}</SelectItem>
              {STATUS_ORDER.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={activePriority} onValueChange={(value) => updateParam('priority', value)}>
            <SelectTrigger>
              <SelectValue placeholder={copy.tickets.table.headers.priority} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.tickets.table.allPriorities}</SelectItem>
              {PRIORITY_ORDER.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {PRIORITY_LABELS[priority]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={activeAssignee} onValueChange={(value) => updateParam('assigneeId', value)}>
            <SelectTrigger className="col-span-2 md:col-span-1">
              <SelectValue placeholder={copy.tickets.detail.assigneeTitle} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.tickets.table.allAssignees}</SelectItem>
              <SelectItem value="unassigned">{copy.tickets.table.unassigned}</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {currentUserId && (
            <Button
              variant={showingMine ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateParam('assigneeId', showingMine ? 'all' : currentUserId)}
              className="h-10 gap-1.5"
            >
              <UserRound className="size-3.5" />
              {copy.tickets.table.myTickets}
            </Button>
          )}

          <Button
            variant={activeAttention ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateParam('attention', activeAttention ? 'all' : 'true')}
            className="h-10 gap-1.5"
          >
            <AlertTriangle className="size-3.5" />
            {copy.tickets.table.attentionOnly}
          </Button>

          <Select value={activeSort} onValueChange={(value) => updateParam('sort', value)}>
            <SelectTrigger className="col-span-2 md:col-span-1">
              <SelectValue placeholder={copy.tickets.table.sort.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_desc">{copy.tickets.table.sort.createdDesc}</SelectItem>
              <SelectItem value="updated_desc">{copy.tickets.table.sort.updatedDesc}</SelectItem>
              <SelectItem value="priority">{copy.tickets.table.sort.priority}</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-10 gap-1.5 text-muted-foreground"
            >
              <FilterX className="size-3.5" />
              {copy.common.clear}
            </Button>
          )}
        </div>
      </div>

      {tickets.length === 0 ? (
        <div className="surface-panel rounded-lg px-5 py-16 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-md bg-muted/60">
            <Inbox className="size-5 text-muted-foreground" />
          </div>
          <p className="font-medium">
            {hasActiveFilters ? copy.tickets.table.emptyFiltered : copy.tickets.table.emptyDefault}
          </p>
          <p className="text-sm text-muted-foreground mt-1.5">
            {hasActiveFilters ? (
              <>
                {copy.tickets.table.emptyFilterHint.replace('limpe a busca.', '')}
                <button onClick={clearFilters} className="text-primary hover:underline">
                  {copy.tickets.table.clearSearch.toLowerCase()}
                </button>
                .
              </>
            ) : (
              copy.tickets.table.emptyDefaultHint
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 md:hidden">
            {tickets.map((ticket) => {
              const staleDays = daysSince(ticket.updatedAt);
              const isStale =
                staleDays >= 3 && !['resolvido', 'arquivado'].includes(ticket.status);

              return (
                <button
                  key={ticket.id}
                  type="button"
                  className="surface-panel rounded-lg p-4 text-left transition-all hover:border-foreground/20 hover:bg-muted/30"
                  onClick={() => router.push(`/tickets/${ticket.code}`)}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="font-mono text-xs font-semibold text-primary">
                        {ticket.code}
                      </span>
                      <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug">
                        {ticket.title}
                      </p>
                    </div>
                    <PriorityBadge priority={ticket.priority} />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <AreaBadge area={ticket.area} />
                    <StatusBadge status={ticket.status} />
                    <span className="truncate text-xs text-muted-foreground">
                      {ticket.subcategory}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span className="truncate">
                      {ticket.assigneeName ?? copy.tickets.table.unassigned}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {isStale
                        ? copy.tickets.table.staleFor(staleDays)
                        : formatPtBrDate(ticket.createdAt, DATE_FORMATS.tableCreated)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="surface-panel hidden overflow-hidden rounded-lg md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/55 text-xs">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground uppercase tracking-wide">
                    {copy.tickets.table.headers.code}
                  </th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground uppercase tracking-wide">
                    {copy.tickets.table.headers.title}
                  </th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                    {copy.tickets.table.headers.area}
                  </th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                    {copy.tickets.table.headers.priority}
                  </th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground uppercase tracking-wide">
                    {copy.tickets.table.headers.status}
                  </th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground uppercase tracking-wide hidden xl:table-cell">
                    {copy.tickets.table.headers.assignee}
                  </th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                    {copy.tickets.table.headers.createdAt}
                  </th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => {
                  const staleDays = daysSince(ticket.updatedAt);
                  const isStale =
                    staleDays >= 3 && !['resolvido', 'arquivado'].includes(ticket.status);

                  return (
                    <tr
                      key={ticket.id}
                      role="link"
                      tabIndex={0}
                      className="cursor-pointer border-b outline-none transition-colors last:border-0 hover:bg-muted/40 focus:bg-muted/40 focus-within:bg-muted/40"
                      onClick={() => router.push(`/tickets/${ticket.code}`)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          router.push(`/tickets/${ticket.code}`);
                        }
                      }}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-primary font-medium">
                          {ticket.code}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[280px]">
                        <p className="line-clamp-1 font-medium">{ticket.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {ticket.subcategory}
                          {ticket.authorName && (
                            <> · {copy.tickets.table.byAuthor(ticket.authorName.split(' ')[0])}</>
                          )}
                          {isStale && (
                            <span className="text-amber-600 dark:text-amber-400">
                              {' '}
                              · {copy.tickets.table.staleFor(staleDays)}
                            </span>
                          )}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <AreaBadge area={ticket.area} />
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <PriorityBadge priority={ticket.priority} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={ticket.status} />
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <span
                          className={ticket.assigneeName ? 'font-medium' : 'text-muted-foreground'}
                        >
                          {ticket.assigneeName ?? copy.tickets.table.unassigned}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell whitespace-nowrap">
                        {formatPtBrDate(ticket.createdAt, DATE_FORMATS.tableCreated)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-col gap-3 rounded-lg border bg-card/70 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground tabular-nums">
            {copy.tickets.table.pagination.range(pageStart, pageEnd, total)}
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="gap-1.5"
            >
              <ChevronLeft className="size-3.5" />
              {copy.tickets.table.pagination.previous}
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums min-w-24 text-center">
              {copy.tickets.table.pagination.page(page, totalPages)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="gap-1.5"
            >
              {copy.tickets.table.pagination.next}
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

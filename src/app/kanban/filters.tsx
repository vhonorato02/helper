'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FilterX, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AREA_OPTIONS, PRIORITY_LABELS, PRIORITY_ORDER } from '@/lib/constants';
import { copy } from '@/lib/copy';

interface Props {
  users: { id: string; displayName: string }[];
}

export function KanbanFilters({ users }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.get('search') ?? '';
  const [search, setSearch] = useState(currentSearch);

  useEffect(() => {
    setSearch(currentSearch);
  }, [currentSearch]);

  const pushParams = useCallback(
    (params: URLSearchParams) => {
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router],
  );

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== 'all') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      pushParams(params);
    },
    [pushParams, searchParams],
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
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [currentSearch, pushParams, search, searchParams]);

  const activeArea = searchParams.get('area') ?? 'all';
  const activeAssignee = searchParams.get('assigneeId') ?? 'all';
  const activePriority = searchParams.get('priority') ?? 'all';
  const hasActive =
    activeArea !== 'all' || activeAssignee !== 'all' || activePriority !== 'all' || !!search;

  return (
    <div className="w-full min-w-0 lg:max-w-[48rem]">
      <div className="grid w-full gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_minmax(8.5rem,0.7fr)_minmax(9rem,0.7fr)_minmax(11rem,0.9fr)_auto]">
        <div className="relative sm:col-span-2 xl:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={copy.kanban.filters.searchPlaceholder}
            className="h-10 pl-8 pr-8 text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={copy.kanban.filters.clearSearch}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <Select value={activeArea} onValueChange={(value) => update('area', value)}>
          <SelectTrigger className="h-10 text-sm">
            <SelectValue placeholder={copy.kanban.filters.area} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{copy.kanban.filters.allAreas}</SelectItem>
            {AREA_OPTIONS.map((area) => (
              <SelectItem key={area.value} value={area.value}>
                {area.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={activePriority} onValueChange={(value) => update('priority', value)}>
          <SelectTrigger className="h-10 text-sm">
            <SelectValue placeholder={copy.kanban.filters.priority} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{copy.kanban.filters.allPriorities}</SelectItem>
            {PRIORITY_ORDER.map((priority) => (
              <SelectItem key={priority} value={priority}>
                {PRIORITY_LABELS[priority]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={activeAssignee} onValueChange={(value) => update('assigneeId', value)}>
          <SelectTrigger className="h-10 text-sm">
            <SelectValue placeholder={copy.kanban.filters.assignee} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{copy.kanban.filters.allAssignees}</SelectItem>
            <SelectItem value="unassigned">{copy.tickets.table.unassigned}</SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('');
              router.push(pathname);
            }}
            className="h-10 min-w-[8rem] gap-1.5 text-muted-foreground sm:col-span-2 xl:col-span-1"
          >
            <FilterX className="size-3.5" />
            {copy.common.clear}
          </Button>
        )}
      </div>
    </div>
  );
}

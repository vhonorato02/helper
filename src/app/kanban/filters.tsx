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
    <div className="flex gap-2 flex-wrap items-center">
      <div className="relative min-w-[220px] flex-1 sm:flex-none sm:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={copy.kanban.filters.searchPlaceholder}
          className="h-8 pl-8 pr-8 text-xs"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
            aria-label={copy.kanban.filters.clearSearch}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <Select value={activeArea} onValueChange={(value) => update('area', value)}>
        <SelectTrigger className="w-36 h-8 text-xs">
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
        <SelectTrigger className="w-36 h-8 text-xs">
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
        <SelectTrigger className="w-44 h-8 text-xs">
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
          className="text-xs text-muted-foreground gap-1.5 h-8"
        >
          <FilterX className="size-3.5" />
          {copy.common.clear}
        </Button>
      )}
    </div>
  );
}

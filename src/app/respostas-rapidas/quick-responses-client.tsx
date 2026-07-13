'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  FilterX,
  Loader2,
  MessageSquareQuote,
  Pencil,
  Power,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FilterField } from '@/components/ui/filter-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  createQuickResponse,
  toggleQuickResponseActive,
  updateQuickResponse,
} from '@/actions/quick-responses';
import { AREA_LABELS, AREA_OPTIONS, type Area } from '@/lib/constants';
import { copy } from '@/lib/copy';
import { cn } from '@/lib/utils';

type QuickResponseRow = {
  id: string;
  area: Area | null;
  title: string;
  body: string;
  isActive: boolean;
  usageCount: number;
  createdById: string | null;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

interface QuickResponsesClientProps {
  responses: QuickResponseRow[];
  currentUserId: string;
  currentUserIsAdmin: boolean;
}

interface QuickResponseFormProps {
  initial?: QuickResponseRow;
  onDone?: () => void;
}

type AreaFilter = Area | 'all' | 'global';
type StatusFilter = 'all' | 'active' | 'inactive';

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function AreaBadge({ area }: { area: Area | null }) {
  return (
    <Badge variant={area ? 'secondary' : 'default'}>
      {area ? AREA_LABELS[area] : copy.quickResponses.global}
    </Badge>
  );
}

function QuickResponseForm({ initial, onDone }: QuickResponseFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [area, setArea] = useState<Area | 'all'>(initial?.area ?? 'all');
  const [isPending, startTransition] = useTransition();
  const isEdit = !!initial;
  const submitLabel = isPending
    ? copy.quickResponses.saving
    : isEdit
      ? copy.common.save
      : copy.quickResponses.create;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set('area', area);

    startTransition(async () => {
      try {
        const result = isEdit
          ? await updateQuickResponse(initial.id, formData)
          : await createQuickResponse(formData);

        if (result && 'error' in result) {
          toast.error(result.error);
          return;
        }

        toast.success(isEdit ? copy.quickResponses.updated : copy.quickResponses.created);
        if (!isEdit) {
          formRef.current?.reset();
          setArea('all');
        }
        onDone?.();
        router.refresh();
      } catch {
        toast.error(copy.validation.serverError);
      }
    });
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor={isEdit ? `qr-title-${initial.id}` : 'qr-title'}>
          {copy.quickResponses.form.title}
        </Label>
        <Input
          id={isEdit ? `qr-title-${initial.id}` : 'qr-title'}
          name="title"
          defaultValue={initial?.title}
          maxLength={80}
          placeholder={copy.quickResponses.form.titlePlaceholder}
          required
          disabled={isPending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={isEdit ? `qr-area-${initial.id}` : 'qr-area'}>
          {copy.quickResponses.form.area}
        </Label>
        <Select
          value={area}
          onValueChange={(value) => setArea(value as Area | 'all')}
          disabled={isPending}
        >
          <SelectTrigger id={isEdit ? `qr-area-${initial.id}` : 'qr-area'}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{copy.quickResponses.global}</SelectItem>
            {AREA_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={isEdit ? `qr-body-${initial.id}` : 'qr-body'}>
          {copy.quickResponses.form.body}
        </Label>
        <Textarea
          id={isEdit ? `qr-body-${initial.id}` : 'qr-body'}
          name="body"
          defaultValue={initial?.body}
          placeholder={copy.quickResponses.form.bodyPlaceholder}
          className="min-h-[150px]"
          maxLength={4000}
          required
          disabled={isPending}
        />
      </div>

      <div className="flex justify-end gap-2">
        {isEdit && (
          <Button type="button" variant="outline" onClick={onDone} disabled={isPending}>
            {copy.common.cancel}
          </Button>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : <MessageSquareQuote />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function QuickResponsesClient({
  responses,
  currentUserId,
  currentUserIsAdmin,
}: QuickResponsesClientProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState<AreaFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isPending, startTransition] = useTransition();

  const activeResponses = responses.filter((response) => response.isActive);
  const inactiveResponses = responses.filter((response) => !response.isActive);
  const totalUsage = responses.reduce((sum, response) => sum + response.usageCount, 0);
  const filteredResponses = useMemo(() => {
    const query = normalizeSearch(search.trim());

    return responses.filter((response) => {
      const matchesArea =
        areaFilter === 'all' ||
        (areaFilter === 'global' ? response.area === null : response.area === areaFilter);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' ? response.isActive : !response.isActive);

      if (!matchesArea || !matchesStatus) return false;
      if (!query) return true;

      const areaLabel = response.area ? AREA_LABELS[response.area] : copy.quickResponses.global;
      const haystack = normalizeSearch(
        [response.title, response.body, areaLabel, response.createdByName ?? ''].join(' '),
      );
      return haystack.includes(query);
    });
  }, [areaFilter, responses, search, statusFilter]);
  const filteredActiveResponses = filteredResponses.filter((response) => response.isActive);
  const filteredInactiveResponses = filteredResponses.filter((response) => !response.isActive);
  const hasActiveFilters =
    search.trim().length > 0 || areaFilter !== 'all' || statusFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setAreaFilter('all');
    setStatusFilter('all');
  };

  const handleToggle = (response: QuickResponseRow) => {
    startTransition(async () => {
      const result = await toggleQuickResponseActive(response.id);
      if (result && 'error' in result) {
        toast.error(result.error);
        return;
      }
      toast.success(
        response.isActive ? copy.quickResponses.deactivated : copy.quickResponses.reactivated,
      );
      setEditingId(null);
      router.refresh();
    });
  };

  const renderResponse = (response: QuickResponseRow) => {
    const canManage = currentUserIsAdmin || response.createdById === currentUserId;
    const isEditing = editingId === response.id;

    return (
      <Card
        key={response.id}
        className={cn(
          'p-4 transition-opacity',
          !response.isActive && 'border-dashed opacity-70',
        )}
      >
        {isEditing ? (
          <QuickResponseForm initial={response} onDone={() => setEditingId(null)} />
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold leading-tight">{response.title}</h2>
                  <AreaBadge area={response.area} />
                  {!response.isActive && (
                    <Badge variant="outline">{copy.quickResponses.inactive}</Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {copy.quickResponses.usage(response.usageCount)}
                  {response.createdByName
                    ? ` · ${copy.quickResponses.createdBy(response.createdByName)}`
                    : ''}
                </p>
              </div>

              {canManage && (
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingId(response.id)}
                    disabled={isPending}
                  >
                    <Pencil className="size-3.5" />
                    {copy.common.edit}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggle(response)}
                    disabled={isPending}
                  >
                    {response.isActive ? (
                      <Power className="size-3.5" />
                    ) : (
                      <RotateCcw className="size-3.5" />
                    )}
                    {response.isActive
                      ? copy.quickResponses.deactivate
                      : copy.quickResponses.reactivate}
                  </Button>
                </div>
              )}
            </div>

            <p className="whitespace-pre-wrap break-words rounded-md border border-border/60 bg-muted/35 p-3 text-sm leading-relaxed">
              {response.body}
            </p>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <section className="surface-elevated h-fit rounded-lg p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold">{copy.quickResponses.createTitle}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {copy.quickResponses.createDescription}
          </p>
        </div>
        <QuickResponseForm />
      </section>

      <section className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border/70 bg-card p-3">
            <p className="text-xs text-muted-foreground">{copy.quickResponses.stats.active}</p>
            <p className="mt-1 text-xl font-bold">{activeResponses.length}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-card p-3">
            <p className="text-xs text-muted-foreground">{copy.quickResponses.stats.inactive}</p>
            <p className="mt-1 text-xl font-bold">{inactiveResponses.length}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-card p-3">
            <p className="text-xs text-muted-foreground">{copy.quickResponses.stats.usage}</p>
            <p className="mt-1 text-xl font-bold">{totalUsage}</p>
          </div>
        </div>

        <div className="surface-panel rounded-lg p-4">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 id="quick-responses-list-title" className="text-base font-semibold">
                {copy.quickResponses.libraryTitle}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {copy.quickResponses.libraryDescription}
              </p>
            </div>
            <Badge variant="outline" className="w-fit" aria-live="polite">
              {copy.quickResponses.filters.count(filteredResponses.length, responses.length)}
            </Badge>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(160px,0.8fr)_minmax(150px,0.7fr)_auto] lg:items-end">
            <FilterField
              label={copy.quickResponses.filters.search}
              htmlFor="quick-response-search"
            >
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="quick-response-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={copy.quickResponses.filters.searchPlaceholder}
                  className="pl-9 pr-10"
                />
                {search && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                    onClick={() => setSearch('')}
                    aria-label={copy.quickResponses.filters.clearSearch}
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            </FilterField>

            <FilterField label={copy.quickResponses.filters.area} htmlFor="quick-response-area">
              <Select
                value={areaFilter}
                onValueChange={(value) => setAreaFilter(value as AreaFilter)}
              >
                <SelectTrigger id="quick-response-area">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{copy.quickResponses.filters.allAreas}</SelectItem>
                  <SelectItem value="global">{copy.quickResponses.filters.globalOnly}</SelectItem>
                  {AREA_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField label={copy.quickResponses.filters.status} htmlFor="quick-response-status">
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as StatusFilter)}
              >
                <SelectTrigger id="quick-response-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{copy.quickResponses.filters.allStatuses}</SelectItem>
                  <SelectItem value="active">{copy.quickResponses.filters.activeOnly}</SelectItem>
                  <SelectItem value="inactive">
                    {copy.quickResponses.filters.inactiveOnly}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FilterField>

            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="lg:self-end"
            >
              <FilterX className="size-4" />
              {copy.quickResponses.filters.clearFilters}
            </Button>
          </div>
        </div>

        {responses.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-sm font-medium">{copy.quickResponses.empty}</p>
            <p className="mt-1 text-xs text-muted-foreground">{copy.quickResponses.emptyHint}</p>
          </div>
        ) : filteredResponses.length === 0 ? (
          <div className="empty-state p-8 text-center">
            <p className="text-sm font-medium">{copy.quickResponses.emptyFiltered}</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
              {copy.quickResponses.emptyFilteredHint}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="mt-4"
            >
              <FilterX className="size-3.5" />
              {copy.quickResponses.filters.clearFilters}
            </Button>
          </div>
        ) : (
          <div
            className="space-y-3"
            aria-labelledby="quick-responses-list-title"
            aria-busy={isPending}
          >
            {filteredActiveResponses.map(renderResponse)}
            {filteredInactiveResponses.length > 0 && (
              <div className={filteredActiveResponses.length > 0 ? 'pt-2' : undefined}>
                <p className="section-label mb-2">{copy.quickResponses.inactiveGroup}</p>
                <div className="space-y-3">{filteredInactiveResponses.map(renderResponse)}</div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

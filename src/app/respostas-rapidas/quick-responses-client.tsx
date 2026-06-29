'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, MessageSquareQuote, Pencil, Power, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
          {isPending ? copy.quickResponses.saving : isEdit ? copy.common.save : copy.quickResponses.create}
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
  const [isPending, startTransition] = useTransition();

  const activeResponses = responses.filter((response) => response.isActive);
  const inactiveResponses = responses.filter((response) => !response.isActive);
  const totalUsage = responses.reduce((sum, response) => sum + response.usageCount, 0);

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

        {responses.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-sm font-medium">{copy.quickResponses.empty}</p>
            <p className="mt-1 text-xs text-muted-foreground">{copy.quickResponses.emptyHint}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeResponses.map(renderResponse)}
            {inactiveResponses.length > 0 && (
              <div className="pt-2">
                <p className="section-label mb-2">{copy.quickResponses.inactiveGroup}</p>
                <div className="space-y-3">{inactiveResponses.map(renderResponse)}</div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

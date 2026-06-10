'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Circle,
  FilterX,
  Loader2,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  cancelChromebookBooking,
  confirmChromebookBooking,
  createChromebookBooking,
  deleteChromebookBooking,
  updateChromebookBooking,
  updateChromebookSettings,
  type ChromebookBookingRow,
} from '@/actions/chromebooks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FilterField } from '@/components/ui/filter-field';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CHROMEBOOK_STATUS_LABELS,
  dateInputInSaoPaulo,
  formatChromebookPeriod,
  timeInputInSaoPaulo,
  type ChromebookBookingStatus,
} from '@/lib/chromebooks';
import { getHolidaySchedulingNotice } from '@/lib/holidays';
import { cn } from '@/lib/utils';

type SettingsRow = {
  totalChromebooks: number;
  updatedAt: Date;
};

type Summary = {
  date: string;
  total: number;
  reservedPeak: number;
  availableAtPeak: number;
  activeBookings: number;
};

type Filters = {
  date?: string;
  status?: string;
  room?: string;
  quantity?: string;
};

const STATUS_BADGE: Record<ChromebookBookingStatus, React.ComponentProps<typeof Badge>['variant']> =
  {
    pendente: 'warning',
    confirmado: 'success',
    cancelado: 'secondary',
  };

function StatusBadge({ status }: { status: ChromebookBookingStatus }) {
  const Icon = status === 'confirmado' ? CheckCircle2 : status === 'cancelado' ? XCircle : Circle;
  return (
    <Badge variant={STATUS_BADGE[status]}>
      <Icon className="size-3" />
      {CHROMEBOOK_STATUS_LABELS[status]}
    </Badge>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  hint: string;
  tone?: 'default' | 'success' | 'warning' | 'destructive';
}) {
  const toneClass = {
    default: 'bg-primary/10 text-primary ring-primary/15',
    success: 'bg-green-500/10 text-green-700 dark:text-green-400 ring-green-500/20',
    warning: 'bg-amber-500/12 text-amber-800 dark:text-amber-300 ring-amber-500/25',
    destructive: 'bg-destructive/10 text-destructive ring-destructive/20',
  }[tone];

  return (
    <div className="surface-panel rounded-lg p-4">
      <p className="section-label">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <span className={cn('rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset', toneClass)}>
          {hint}
        </span>
      </div>
    </div>
  );
}

function formatDateTimeLocal(date: Date) {
  return {
    date: dateInputInSaoPaulo(date),
    time: timeInputInSaoPaulo(date),
  };
}

function BookingDialog({
  open,
  onOpenChange,
  initial,
  currentUserName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: ChromebookBookingRow | null;
  currentUserName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEdit = !!initial;
  const start = initial ? formatDateTimeLocal(new Date(initial.startAt)) : null;
  const end = initial ? formatDateTimeLocal(new Date(initial.endAt)) : null;
  const minimumBookingDate = dateInputInSaoPaulo(new Date());
  const [date, setDate] = useState(start?.date ?? '');
  const holidayNotice = getHolidaySchedulingNotice(date);

  useEffect(() => {
    if (open) setDate(start?.date ?? '');
  }, [initial?.id, open, start?.date]);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = isEdit
        ? await updateChromebookBooking(initial.id, formData)
        : await createChromebookBooking(formData);

      if (result && 'error' in result) {
        toast.error(result.error);
        return;
      }

      toast.success(isEdit ? 'Agendamento atualizado.' : 'Agendamento inserido.');
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !isPending && onOpenChange(value)}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar agendamento' : 'Inserir agendamento'}</DialogTitle>
          <DialogDescription>
            O sistema bloqueia conflito de sala e excesso de Chromebooks no mesmo intervalo.
          </DialogDescription>
        </DialogHeader>

        <form key={initial?.id ?? 'new-booking'} onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="chromebook-date">Data</Label>
              <Input
                id="chromebook-date"
                name="date"
                type="date"
                value={date}
                min={isEdit ? undefined : minimumBookingDate}
                onChange={(event) => setDate(event.target.value)}
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="chromebook-start">Início</Label>
              <Input
                id="chromebook-start"
                name="startTime"
                type="time"
                defaultValue={start?.time ?? ''}
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="chromebook-end">Término</Label>
              <Input
                id="chromebook-end"
                name="endTime"
                type="time"
                defaultValue={end?.time ?? ''}
                required
                disabled={isPending}
              />
            </div>
          </div>

          {holidayNotice && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-500/25 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <p>{holidayNotice.message}</p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
            <div className="space-y-1.5">
              <Label htmlFor="chromebook-room">Sala solicitante</Label>
              <Input
                id="chromebook-room"
                name="room"
                defaultValue={initial?.room ?? ''}
                placeholder="Ex: Sala 12"
                maxLength={80}
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="chromebook-quantity">Quantidade</Label>
              <Input
                id="chromebook-quantity"
                name="quantity"
                type="number"
                min={1}
                max={500}
                defaultValue={initial?.quantity ?? 1}
                required
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_220px_180px]">
            <div className="space-y-1.5">
              <Label htmlFor="chromebook-requester">Solicitante</Label>
              <Input
                id="chromebook-requester"
                name="requesterName"
                defaultValue={initial?.requesterName ?? currentUserName}
                maxLength={120}
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="chromebook-contact">Contato</Label>
              <Input
                id="chromebook-contact"
                name="requesterContact"
                defaultValue={initial?.requesterContact ?? ''}
                placeholder="E-mail ou telefone"
                maxLength={120}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select name="status" defaultValue={initial?.status ?? 'confirmado'} disabled={isPending}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="chromebook-notes">Observações</Label>
            <Textarea
              id="chromebook-notes"
              name="notes"
              defaultValue={initial?.notes ?? ''}
              className="min-h-[90px]"
              maxLength={1000}
              disabled={isPending}
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SettingsForm({ total, isAdmin }: { total: number; isAdmin: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateChromebookSettings(formData);
      if (result && 'error' in result) {
        toast.error(result.error);
        return;
      }
      toast.success('Total de Chromebooks atualizado.');
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="surface-elevated rounded-lg p-4">
      <div className="mb-3 flex items-center gap-2">
        <Settings className="size-4 text-primary" />
        <h2 className="font-semibold">Disponibilidade total</h2>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          name="totalChromebooks"
          type="number"
          min={1}
          max={500}
          defaultValue={total}
          disabled={!isAdmin || isPending}
          aria-label="Total de Chromebooks disponíveis"
        />
        <Button type="submit" disabled={!isAdmin || isPending}>
          {isPending && <Loader2 className="animate-spin" />}
          Alterar total
        </Button>
      </div>
      {!isAdmin && (
        <p className="mt-2 text-xs text-muted-foreground">
          Apenas administradores alteram o total disponível.
        </p>
      )}
    </form>
  );
}

export function ChromebookAdminClient({
  bookings,
  settings,
  summary,
  filters,
  currentUserName,
  isAdmin,
}: {
  bookings: ChromebookBookingRow[];
  settings: SettingsRow;
  summary: Summary;
  filters: Filters;
  currentUserName: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ChromebookBookingRow | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<ChromebookBookingRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ChromebookBookingRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const hasActiveFilters = Boolean(
    filters.date ||
      (filters.status && filters.status !== 'all') ||
      filters.room ||
      filters.quantity,
  );

  const activeCount = useMemo(
    () => bookings.filter((booking) => booking.status !== 'cancelado').length,
    [bookings],
  );

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (booking: ChromebookBookingRow) => {
    setEditing(booking);
    setDialogOpen(true);
  };

  const runCancel = () => {
    if (!confirmCancel) return;
    startTransition(async () => {
      const result = await cancelChromebookBooking(confirmCancel.id);
      if (result && 'error' in result) toast.error(result.error);
      else toast.success('Agendamento cancelado.');
      setConfirmCancel(null);
      router.refresh();
    });
  };

  const runConfirm = (booking: ChromebookBookingRow) => {
    startTransition(async () => {
      const result = await confirmChromebookBooking(booking.id);
      if (result && 'error' in result) toast.error(result.error);
      else toast.success('Agendamento aprovado.');
      router.refresh();
    });
  };

  const runDelete = () => {
    if (!confirmDelete) return;
    startTransition(async () => {
      const result = await deleteChromebookBooking(confirmDelete.id);
      if (result && 'error' in result) toast.error(result.error);
      else toast.success('Agendamento excluído.');
      setConfirmDelete(null);
      router.refresh();
    });
  };

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total configurado" value={settings.totalChromebooks} hint="máquinas" />
        <SummaryCard
          label="Reservadas no pico"
          value={summary.reservedPeak}
          hint={summary.date}
          tone={summary.reservedPeak >= summary.total ? 'destructive' : 'warning'}
        />
        <SummaryCard
          label="Saldo mínimo"
          value={summary.availableAtPeak}
          hint={summary.availableAtPeak > 0 ? 'disponível' : 'lotado'}
          tone={summary.availableAtPeak > 0 ? 'success' : 'destructive'}
        />
        <SummaryCard label="Agendamentos ativos" value={activeCount} hint="filtrados" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <section className="surface-elevated overflow-hidden rounded-lg">
          <div className="border-b p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="font-semibold">Agendamentos</h2>
                <p className="text-sm text-muted-foreground">
                  Consulte, filtre, edite, cancele e acompanhe indisponibilidades.
                </p>
              </div>
              <Button onClick={openCreate}>
                <Plus className="size-4" />
                Inserir agendamento
              </Button>
            </div>

            <form
              action="/chromebooks"
              className="mt-4 rounded-lg border border-border/70 bg-card/80 p-3 shadow-xs sm:p-4"
            >
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-[minmax(9rem,0.75fr)_minmax(10rem,0.8fr)_minmax(12rem,1fr)_minmax(10rem,0.8fr)_auto] 2xl:items-end">
                <FilterField label="Data" htmlFor="chromebook-filter-date">
                  <Input
                    id="chromebook-filter-date"
                    name="date"
                    type="date"
                    defaultValue={filters.date ?? ''}
                    aria-label="Filtrar por data"
                  />
                </FilterField>

                <FilterField label="Status" htmlFor="chromebook-filter-status">
                  <Select name="status" defaultValue={filters.status ?? 'all'}>
                    <SelectTrigger id="chromebook-filter-status" aria-label="Filtrar por status">
                      <SelectValue placeholder="Todos status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos status</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="confirmado">Confirmado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterField>

                <FilterField label="Sala" htmlFor="chromebook-filter-room">
                  <Input
                    id="chromebook-filter-room"
                    name="room"
                    placeholder="Sala"
                    defaultValue={filters.room ?? ''}
                    aria-label="Filtrar por sala"
                  />
                </FilterField>

                <FilterField label="Quantidade mínima" htmlFor="chromebook-filter-quantity">
                  <Input
                    id="chromebook-filter-quantity"
                    name="quantity"
                    type="number"
                    min={1}
                    placeholder="Qtd. mínima"
                    defaultValue={filters.quantity ?? ''}
                    aria-label="Filtrar por quantidade mínima"
                  />
                </FilterField>

                <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2 xl:col-span-4 2xl:col-span-1 2xl:flex">
                  <Button type="submit" variant="outline" className="h-10 w-full 2xl:w-auto">
                    <Search className="size-4" />
                    Filtrar
                  </Button>
                  {hasActiveFilters && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => router.push('/chromebooks')}
                      className="h-10 w-full text-muted-foreground 2xl:w-auto"
                    >
                      <FilterX className="size-4" />
                      Limpar
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </div>

          {bookings.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-lg bg-muted/60">
                <CalendarClock className="size-5 text-muted-foreground" />
              </div>
              <p className="font-semibold">Nenhum agendamento encontrado.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ajuste os filtros ou insira o primeiro empréstimo de Chromebooks.
              </p>
            </div>
          ) : (
            <>
            <div className="grid gap-3 p-4 md:hidden">
              {bookings.map((booking) => (
                <article key={booking.id} className="rounded-lg border bg-card/70 p-4 shadow-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{formatChromebookPeriod(booking.startAt, booking.endAt)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {booking.room} · {booking.quantity} Chromebook(s)
                      </p>
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>
                  <div className="mt-3 space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">Solicitante: </span>
                      {booking.requesterName}
                    </p>
                    {booking.requesterContact && (
                      <p>
                        <span className="text-muted-foreground">Contato: </span>
                        {booking.requesterContact}
                      </p>
                    )}
                    {booking.protocol && (
                      <p className="font-mono text-xs text-primary">{booking.protocol}</p>
                    )}
                    {booking.notes && <p className="text-muted-foreground">{booking.notes}</p>}
                  </div>
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    {booking.status === 'pendente' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => runConfirm(booking)}
                          disabled={isPending}
                        >
                          <CheckCircle2 className="size-3.5" />
                          Aprovar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmCancel(booking)}
                          disabled={isPending}
                        >
                          <XCircle className="size-3.5" />
                          Recusar
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => openEdit(booking)}>
                      <Pencil className="size-3.5" />
                      Editar
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setConfirmDelete(booking)}
                      >
                        <Trash2 className="size-3.5" />
                        Excluir
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 text-left font-semibold">Data e horário</th>
                    <th className="px-4 py-3 text-left font-semibold">Sala</th>
                    <th className="px-4 py-3 text-left font-semibold">Qtd.</th>
                    <th className="px-4 py-3 text-left font-semibold">Solicitante</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="border-b last:border-0 hover:bg-muted/35">
                      <td className="px-4 py-3 whitespace-nowrap font-medium">
                        {formatChromebookPeriod(booking.startAt, booking.endAt)}
                        {booking.notes && (
                          <p className="mt-1 max-w-[320px] truncate text-xs font-normal text-muted-foreground">
                            {booking.notes}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">{booking.room}</td>
                      <td className="px-4 py-3 tabular-nums">{booking.quantity}</td>
                      <td className="px-4 py-3">
                        {booking.requesterName}
                        {booking.requesterContact && (
                          <p className="text-xs text-muted-foreground">{booking.requesterContact}</p>
                        )}
                        {booking.protocol && (
                          <p className="font-mono text-xs text-primary">{booking.protocol}</p>
                        )}
                        {booking.responsibleName && (
                          <p className="text-xs text-muted-foreground">Resp. {booking.responsibleName}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={booking.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {booking.status === 'pendente' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => runConfirm(booking)}
                                title="Aprovar"
                                aria-label="Aprovar agendamento"
                                disabled={isPending}
                              >
                                <CheckCircle2 className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setConfirmCancel(booking)}
                                title="Recusar"
                                aria-label="Recusar agendamento"
                                disabled={isPending}
                              >
                                <XCircle className="size-3.5" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEdit(booking)}
                            title="Editar"
                            aria-label="Editar agendamento"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          {booking.status === 'confirmado' && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setConfirmCancel(booking)}
                              title="Cancelar"
                              aria-label="Cancelar agendamento"
                              disabled={isPending}
                            >
                              <XCircle className="size-3.5" />
                            </Button>
                          )}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setConfirmDelete(booking)}
                              title="Excluir"
                              aria-label="Excluir agendamento"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </section>

        <aside className="space-y-4">
          <SettingsForm total={settings.totalChromebooks} isAdmin={isAdmin} />

          <div className="surface-elevated rounded-lg p-4">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
              <h2 className="font-semibold">Regras de bloqueio</h2>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Mesmo horário e mesma sala não pode repetir.</li>
              <li>A soma de máquinas em horários sobrepostos não pode passar do total.</li>
              <li>Feriados e pontos facultativos bloqueiam solicitações públicas.</li>
              <li>Dia parcial só aceita horários a partir do segundo período.</li>
            </ul>
          </div>
        </aside>
      </div>

      <BookingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        currentUserName={currentUserName}
      />

      <ConfirmDialog
        open={!!confirmCancel}
        onOpenChange={(open) => !open && setConfirmCancel(null)}
        title="Cancelar agendamento?"
        description="O horário será liberado para novas solicitações, mas o registro continuará visível."
        confirmLabel="Cancelar agendamento"
        variant="destructive"
        onConfirm={runCancel}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Excluir definitivamente?"
        description="Use exclusão apenas para registros criados por engano. Cancelar preserva melhor o histórico."
        confirmLabel={isPending ? 'Excluindo...' : 'Excluir'}
        variant="destructive"
        onConfirm={runDelete}
      />
    </>
  );
}

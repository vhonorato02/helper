import Link from 'next/link';
import type React from 'react';
import { redirect } from 'next/navigation';
import {
  ArrowUpRight,
  FileInput,
  Inbox,
  Laptop2,
  ListChecks,
  Plus,
  UserRoundCheck,
} from 'lucide-react';
import { auth } from '@/auth';
import { getExternalIntakeSummary } from '@/actions/external-intake';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PublicIntakeActions } from './public-intake-actions';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Solicitações públicas',
};

function Stat({
  label,
  value,
  href,
  icon,
}: {
  label: string;
  value: number;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href} className="surface-panel rounded-lg p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="section-label">{label}</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
        </div>
        <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </div>
      </div>
    </Link>
  );
}

export default async function SolicitacoesPublicasPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const summary = await getExternalIntakeSummary(60);

  return (
    <div className="space-y-6">
      <div className="page-hero flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-label">Entrada externa</p>
          <h1 className="mt-1.5 flex items-center gap-2 text-2xl font-bold tracking-tight">
            <FileInput className="size-5 text-primary" />
            Solicitações públicas
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            Pedidos enviados sem login: suporte, comunicação, outras escolas e reservas de Chromebooks.
          </p>
        </div>
        <div className="page-actions">
          <Button variant="outline" asChild>
            <Link href="/solicitar">
              <Plus className="size-4" />
              Formulários públicos
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/chromebooks">
              <Laptop2 className="size-4" />
              Chromebooks
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Tickets públicos"
          value={summary.publicTicketCount}
          href="/tickets?origin=public&status=ativas"
          icon={<ListChecks className="size-4" />}
        />
        <Stat
          label="Sem responsável"
          value={summary.publicUnassignedCount}
          href="/tickets?origin=public&status=ativas&assigneeId=unassigned"
          icon={<UserRoundCheck className="size-4" />}
        />
        <Stat
          label="Chromebooks pendentes"
          value={summary.chromebookPendingCount}
          href="/chromebooks?status=pendente"
          icon={<Laptop2 className="size-4" />}
        />
      </div>

      <section className="surface-elevated overflow-hidden rounded-lg">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Fila de triagem</h2>
            <p className="text-xs text-muted-foreground">
              Mais antigos primeiro, misturando tickets públicos e reservas.
            </p>
          </div>
          <Badge variant={summary.totalActive > 0 ? 'warning' : 'success'}>
            {summary.totalActive} ativo{summary.totalActive === 1 ? '' : 's'}
          </Badge>
        </div>

        {summary.items.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-lg bg-muted/60">
              <Inbox className="size-5 text-muted-foreground" />
            </div>
            <p className="font-semibold">Nenhuma solicitação pública pendente</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Quando escolas, setores ou professores enviarem algo, aparece aqui.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {summary.items.map((item) => (
              <div
                key={`${item.kind}-${item.id}`}
                className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/25 sm:flex-row sm:items-start sm:justify-between"
              >
                <Link href={item.href} className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-primary">
                          {item.code}
                        </span>
                        <Badge variant={item.kind === 'chromebook' ? 'warning' : 'secondary'}>
                          {item.kind === 'chromebook' ? 'Chromebook' : 'Ticket'}
                        </Badge>
                        {item.kind === 'ticket' && !item.assigneeId && (
                          <Badge variant="outline">sem responsável</Badge>
                        )}
                      </div>
                      <p className="line-clamp-1 text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.detail}</p>
                      {(item.location || item.contact) && (
                        <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
                          {[item.location, item.contact].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
                  </div>
                </Link>
                <div className="shrink-0 sm:pt-1">
                  <PublicIntakeActions item={item} canManageChromebooks={!!session.user.isAdmin} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Activity,
  CheckCircle2,
  Database,
  Loader2,
  Mail,
  Send,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AREA_OPTIONS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface SystemStatus {
  ok: boolean;
  database: { ok: boolean; latencyMs: number };
  email: {
    gmail: boolean;
    cronSecret: boolean;
    recipients: { general: number; ti: number };
  };
  counts: { tickets: number; activeUsers: number; schedules: number; chromebookBookings: number };
  env: { app: string; node: string; vercel: boolean; region: string };
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md ring-1 ring-inset',
        ok
          ? 'bg-green-500/10 text-green-700 ring-green-500/30 dark:text-green-400'
          : 'bg-destructive/10 text-destructive ring-destructive/30',
      )}
    >
      {ok ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
      {label}
    </span>
  );
}

function StatusPanel() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/system-status', { cache: 'no-store' });
      if (res.ok) setStatus(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  if (loading && !status) {
    return (
      <div className="surface-elevated rounded-lg p-5">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!status) return null;

  const emailReady = status.email.gmail;
  const recipientsReady = status.email.recipients.general > 0;

  return (
    <div className="surface-elevated rounded-lg p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <Activity className="size-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold">Status do sistema</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Verificações de saúde e configuração.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : 'Atualizar'}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border bg-card/50 p-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            <Database className="inline size-3 mr-1" />
            Banco de dados
          </p>
          <div className="flex items-center justify-between">
            <StatusBadge ok={status.database.ok} label={status.database.ok ? 'Conectado' : 'Erro'} />
            <span className="text-xs text-muted-foreground tabular-nums">
              {status.database.latencyMs}ms
            </span>
          </div>
        </div>

        <div className="rounded-lg border bg-card/50 p-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            <Mail className="inline size-3 mr-1" />
            E-mail
          </p>
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge ok={emailReady} label={emailReady ? 'Provedor OK' : 'Sem provedor'} />
            <StatusBadge
              ok={recipientsReady}
              label={`${status.email.recipients.general + status.email.recipients.ti} destinatário(s)`}
            />
          </div>
          <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
            <p>Gmail: {status.email.gmail ? 'Configurado' : 'Não configurado'}</p>
            <p>CRON_SECRET: {status.email.cronSecret ? 'Configurado' : 'Não configurado (recomendado)'}</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card/50 p-3 sm:col-span-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Dados
          </p>
          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            <div>
              <p className="text-lg font-bold tabular-nums">{status.counts.tickets}</p>
              <p className="text-xs text-muted-foreground">Demandas</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums">{status.counts.activeUsers}</p>
              <p className="text-xs text-muted-foreground">Usuários ativos</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums">{status.counts.schedules}</p>
              <p className="text-xs text-muted-foreground">Agendamentos</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums">{status.counts.chromebookBookings}</p>
              <p className="text-xs text-muted-foreground">Chromebooks</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card/50 p-3 sm:col-span-2 text-xs text-muted-foreground">
          <span className="font-mono">{status.env.app}</span>
          {' '}·{' '}
          <span className="font-mono">Node {status.env.node}</span>
          {status.env.vercel && (
            <>
              {' '}· <span className="font-mono">Vercel · {status.env.region}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function SystemTools() {
  const [area, setArea] = useState<'TI' | 'MKT' | 'PF'>('TI');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const handleTestEmail = async () => {
    setLoading(true);
    setLastResult(null);
    try {
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ area }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        sent?: { ok?: boolean; provider?: string; reason?: string };
        error?: string;
      };

      if (!res.ok || !data.ok) {
        toast.error(data.error ?? 'Falha ao enviar.');
        setLastResult(`Erro: ${data.error ?? res.status}`);
        return;
      }

      if (data.sent?.ok) {
        toast.success(`Enviado via ${data.sent.provider ?? 'provider'}.`);
        setLastResult(`OK — enviado via ${data.sent.provider}`);
      } else {
        toast.warning(`Não enviou. Motivo: ${data.sent?.reason ?? 'desconhecido'}.`);
        setLastResult(`Não enviou: ${data.sent?.reason ?? 'desconhecido'}`);
      }
    } catch (err) {
      toast.error('Erro de rede.');
      setLastResult(`Erro de rede: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
    <StatusPanel />
    <div className="surface-elevated rounded-lg p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <Mail className="size-4 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Teste de e-mail</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Envia um e-mail de teste para os destinatários da área escolhida.
            Útil para verificar se o Gmail com senha de aplicativo está configurado.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="space-y-1.5 sm:w-[180px]">
          <Label htmlFor="system-test-email-area" className="text-xs text-muted-foreground">
            Área do teste
          </Label>
          <Select value={area} onValueChange={(v) => setArea(v as 'TI' | 'MKT' | 'PF')}>
            <SelectTrigger id="system-test-email-area">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AREA_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleTestEmail} disabled={loading}>
          {loading ? <Loader2 className="animate-spin size-4" /> : <Send className="size-4" />}
          Enviar teste
        </Button>
      </div>

      {lastResult && (
        <p className="text-xs text-muted-foreground font-mono px-3 py-2 bg-muted/40 rounded-md">
          {lastResult}
        </p>
      )}

      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer font-medium">Como configurar (Gmail)</summary>
        <div className="mt-2 space-y-1 leading-relaxed">
          <p>1. Acesse <strong>myaccount.google.com</strong> → Segurança → Verificação em 2 etapas (ative).</p>
          <p>2. Volte em Segurança → <strong>Senhas de app</strong>. Crie uma para &quot;Helper&quot;.</p>
          <p>3. Na Vercel, em Environment Variables, configure:</p>
          <ul className="ml-4 list-disc space-y-0.5">
            <li><code>GMAIL_USER</code> — seu Gmail</li>
            <li><code>GMAIL_APP_PASSWORD</code> — a senha de 16 caracteres</li>
          </ul>
          <p>4. Redeploy do app. Volte aqui e clique em &quot;Enviar teste&quot;.</p>
        </div>
      </details>
    </div>
    </div>
  );
}

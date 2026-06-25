'use client';

import { useEffect, useState, useTransition } from 'react';
import { BellRing, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getBrowserNotificationPulse } from '@/actions/reminder-pulse';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'helper.browser-notification-ledger';
const POLL_MS = 60_000;

type Ledger = Record<string, number>;

function readLedger(): Ledger {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Ledger;
  } catch {
    return {};
  }
}

function writeLedger(ledger: Ledger) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ledger));
}

async function showBrowserNotification(input: {
  id: string;
  title: string;
  body: string;
  href: string;
}) {
  const options: NotificationOptions = {
    body: input.body,
    icon: '/icon-192.png',
    badge: '/favicon-32.png',
    tag: input.id,
    data: { url: input.href },
  };

  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(input.title, options);
    return;
  }

  const notification = new Notification(input.title, options);
  notification.onclick = () => {
    window.focus();
    window.location.href = input.href;
  };
}

export function BrowserNotificationAgent() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;

    let active = true;

    const tick = async () => {
      if (!active || Notification.permission !== 'granted') return;

      try {
        const pulse = await getBrowserNotificationPulse();
        if (!pulse.browserEnabled) return;

        const ledger = readLedger();
        const now = Date.now();
        let changed = false;

        for (const item of pulse.items) {
          const lastShown = ledger[item.id] ?? 0;
          const repeatWindow = item.repeat ? item.repeatMinutes * 60_000 : Number.POSITIVE_INFINITY;
          if (lastShown && now - lastShown < repeatWindow) continue;
          if (lastShown && !item.repeat) continue;

          await showBrowserNotification({
            id: item.id,
            title: item.kind === 'notification' ? item.title : `Lembrete: ${item.title}`,
            body: item.body,
            href: item.href,
          });
          ledger[item.id] = now;
          changed = true;
        }

        if (changed) writeLedger(ledger);
      } catch {
        // Silencioso: alertas do navegador sao apoio, nao devem quebrar a UI.
      }
    };

    tick();
    const interval = window.setInterval(tick, POLL_MS);
    const onFocus = () => tick();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, []);

  return null;
}

export function BrowserNotificationPermissionPanel() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });
  const [isPending, startTransition] = useTransition();

  const enable = () => {
    startTransition(async () => {
      if (!('Notification' in window)) {
        setPermission('unsupported');
        return;
      }

      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission === 'granted') toast.success('Notificações do navegador ativadas.');
      if (nextPermission === 'denied') toast.error('O navegador bloqueou as notificações para este site.');
    });
  };

  const sendTest = () => {
    startTransition(async () => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      await showBrowserNotification({
        id: `test:${Date.now()}`,
        title: 'Helper ativo',
        body: 'Quando houver lembrete, ele aparece por aqui também.',
        href: '/notificacoes',
      });
    });
  };

  if (permission === 'unsupported') return null;

  return (
    <section className="surface-elevated rounded-lg p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <BellRing className="size-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Alertas no navegador e PWA</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {permission === 'granted'
                ? 'Ativos neste dispositivo. O Helper avisa lembretes, atribuições e pendências próximas.'
                : 'Permita neste dispositivo para receber lembretes fora da inbox interna.'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          {permission !== 'granted' ? (
            <Button type="button" size="sm" onClick={enable} disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              Ativar
            </Button>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={sendTest} disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              Testar
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

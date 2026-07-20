'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { BellRing, Loader2, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { getBrowserNotificationPulse } from '@/actions/reminder-pulse';
import {
  getPushRegistrationState,
  registerPushSubscription,
  unregisterPushSubscription,
} from '@/actions/notifications';
import { Button } from '@/components/ui/button';
import {
  resolvePushPanelStatus,
  supportsBrowserPush,
  type PushPanelStatus,
} from '@/lib/push-registration-state';

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

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

async function readCurrentSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

function isExpiredSubscription(subscription: PushSubscription | null) {
  return Boolean(subscription?.expirationTime && subscription.expirationTime <= Date.now());
}

async function forgetCurrentSubscription(subscription: PushSubscription) {
  await unregisterPushSubscription(subscription.endpoint);
  try {
    await subscription.unsubscribe();
  } catch (error) {
    console.warn('Nao foi possivel cancelar a assinatura push local.', error);
  }
}

async function loadPublicVapidKey() {
  const response = await fetch('/api/push/public-key', {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as { publicKey?: unknown };
  return typeof payload.publicKey === 'string' && payload.publicKey ? payload.publicKey : null;
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
  const [status, setStatus] = useState<PushPanelStatus>('loading');
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const [deviceCount, setDeviceCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    if (
      typeof window === 'undefined' ||
      !supportsBrowserPush({
        notification: 'Notification' in window,
        serviceWorker: 'serviceWorker' in navigator,
        pushManager: 'PushManager' in window,
      })
    ) {
      setPermission('unsupported');
      setStatus('unsupported');
      return;
    }

    setPermission(Notification.permission);
    const subscription = await readCurrentSubscription();

    if (Notification.permission === 'denied') {
      if (subscription) await forgetCurrentSubscription(subscription);
      const state = await getPushRegistrationState(null);
      setDeviceCount(state.subscriptionCount);
      setStatus('denied');
      return;
    }

    const state = await getPushRegistrationState(subscription?.endpoint ?? null);
    setDeviceCount(state.subscriptionCount);

    if (subscription && isExpiredSubscription(subscription)) {
      await forgetCurrentSubscription(subscription);
      const refreshedState = await getPushRegistrationState(null);
      setDeviceCount(refreshedState.subscriptionCount);
      setStatus(resolvePushPanelStatus({
        permission: Notification.permission,
        publicKey: refreshedState.publicKey,
        hasSubscription: false,
        currentEndpointRegistered: false,
        subscriptionExpired: true,
      }));
      return;
    }

    setStatus(resolvePushPanelStatus({
      permission: Notification.permission,
      publicKey: state.publicKey,
      hasSubscription: Boolean(subscription),
      currentEndpointRegistered: state.currentEndpointRegistered,
      subscriptionExpired: false,
    }));
  }, []);

  useEffect(() => {
    refresh().catch(() => setStatus('unsupported'));
  }, [refresh]);

  const enable = () => {
    startTransition(async () => {
      if (
        !supportsBrowserPush({
          notification: 'Notification' in window,
          serviceWorker: 'serviceWorker' in navigator,
          pushManager: 'PushManager' in window,
        })
      ) {
        setPermission('unsupported');
        setStatus('unsupported');
        return;
      }

      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission === 'granted') {
        const publicKey = await loadPublicVapidKey();
        if (!publicKey) {
          setStatus('unconfigured');
          toast.error('Web Push ainda não está configurado no servidor.');
          return;
        }

        const registration = await navigator.serviceWorker.ready;
        const existingSubscription = await registration.pushManager.getSubscription();
        if (existingSubscription && isExpiredSubscription(existingSubscription)) {
          await forgetCurrentSubscription(existingSubscription);
        }
        const subscription =
          existingSubscription && !isExpiredSubscription(existingSubscription)
            ? existingSubscription
            : await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey),
              });

        const result = await registerPushSubscription(subscription.toJSON());
        if (!result.ok) {
          toast.error(result.error);
          return;
        }

        await refresh();
        toast.success('Notificações PWA ativadas neste dispositivo.');
      }
      if (nextPermission === 'denied') toast.error('O navegador bloqueou as notificações para este site.');
    });
  };

  const disable = () => {
    startTransition(async () => {
      const subscription = await readCurrentSubscription();
      if (subscription) {
        await forgetCurrentSubscription(subscription);
      }
      await refresh();
      toast.success('Notificações PWA desativadas neste dispositivo.');
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

  if (status === 'loading') return null;

  const descriptionByStatus: Record<PushPanelStatus, string> = {
    loading: '',
    unsupported: 'Este navegador não oferece Web Push para o Helper.',
    unconfigured: 'O servidor ainda precisa das variáveis VAPID para ativar push real.',
    denied: 'O navegador bloqueou notificações para este site.',
    active: 'Ativas neste dispositivo. O Helper pode avisar mesmo com a janela fechada.',
    expired: deviceCount > 0
      ? 'Este dispositivo precisa ser reativado. Há outro dispositivo salvo na sua conta.'
      : 'Ative neste dispositivo para receber avisos fora da inbox interna.',
  };

  return (
    <section className="surface-elevated rounded-lg p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Smartphone className="size-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Push no PWA</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {descriptionByStatus[status]}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          {status === 'active' ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={sendTest} disabled={isPending}>
                {isPending && <Loader2 className="animate-spin" />}
                Testar
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={disable} disabled={isPending}>
                {isPending && <Loader2 className="animate-spin" />}
                Desativar
              </Button>
            </>
          ) : status === 'unsupported' || status === 'unconfigured' || permission === 'denied' ? (
            <Button type="button" variant="outline" size="sm" disabled>
              <BellRing className="size-4" />
              Indisponível
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={enable} disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              Ativar
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

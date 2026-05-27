'use client';

import { useEffect, useState } from 'react';
import { Download, RefreshCw, Share, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'pwa-install-dismissed-at';
const COOLDOWN_DAYS = 7;

export function PwaInstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosVisible, setIosVisible] = useState(false);
  const [updateVisible, setUpdateVisible] = useState(false);
  const [waitingRegistration, setWaitingRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      const prompt = e as BeforeInstallPromptEvent;

      try {
        const dismissedAt = localStorage.getItem(DISMISSED_KEY);
        if (dismissedAt) {
          const ageDays = (Date.now() - Number(dismissedAt)) / (24 * 60 * 60 * 1000);
          if (ageDays < COOLDOWN_DAYS) return;
        }
      } catch {
        // ignore localStorage errors
      }

      setEvent(prompt);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setVisible(false);
      setEvent(null);
    });

    try {
      const ua = window.navigator.userAgent;
      const isIos = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
      const isSafari = /^((?!CriOS|FxiOS|EdgiOS|OPiOS).)*Safari/i.test(ua);
      if (isIos && isSafari && !isStandalone) setIosVisible(true);
    } catch {
      // ignore UA detection errors
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const onControllerChange = () => {
      window.location.reload();
    };

    navigator.serviceWorker.ready
      .then((registration) => {
        if (registration.waiting) {
          setWaitingRegistration(registration);
          setUpdateVisible(true);
        }

        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingRegistration(registration);
              setUpdateVisible(true);
            }
          });
        });
      })
      .catch(() => {});

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  const handleInstall = async () => {
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    setVisible(false);
    setEvent(null);
  };

  const handleDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  };

  const handleUpdate = () => {
    const worker = waitingRegistration?.waiting;
    if (!worker) return;
    worker.postMessage('SKIP_WAITING');
    window.setTimeout(() => window.location.reload(), 800);
  };

  if (updateVisible) {
    return (
      <div
        className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm animate-in slide-in-from-bottom-2"
        role="status"
      >
        <div className="surface-elevated flex items-start gap-3 rounded-xl border bg-card p-4 shadow-lg">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <RefreshCw className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Nova versão disponível</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Recarregue para usar a versao mais recente.
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={handleUpdate}>
                Recarregar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setUpdateVisible(false)}>
                Depois
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (iosVisible) {
    return (
      <div
        className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm animate-in slide-in-from-bottom-2"
        role="dialog"
        aria-label="Instalar aplicativo no iOS"
      >
        <div className="surface-elevated flex items-start gap-3 rounded-xl border bg-card p-4 shadow-lg">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <Share className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Instalar no iPhone ou iPad</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início.
            </p>
            <div className="mt-3">
              <Button size="sm" variant="ghost" onClick={() => setIosVisible(false)}>
                Entendi
              </Button>
            </div>
          </div>
          <button
            onClick={() => setIosVisible(false)}
            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!visible || !event) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm animate-in slide-in-from-bottom-2"
      role="dialog"
      aria-label="Instalar aplicativo"
    >
      <div className="surface-elevated rounded-xl border bg-card p-4 shadow-lg flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <Download className="size-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Instalar Helper</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Instale na tela inicial para abrir como aplicativo.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={handleInstall}>
              Instalar
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              Depois
            </Button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Fechar"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

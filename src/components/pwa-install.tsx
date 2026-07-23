'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, RefreshCw, Share, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'pwa-install-dismissed-at';
const COOLDOWN_DAYS = 30;
const PROMPT_DELAY_MS = 45_000;

function wasRecentlyDismissed() {
  try {
    const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY));
    if (!Number.isFinite(dismissedAt) || dismissedAt <= 0) return false;
    const ageDays = (Date.now() - dismissedAt) / (24 * 60 * 60 * 1000);
    return ageDays < COOLDOWN_DAYS;
  } catch {
    return false;
  }
}

function rememberDismissal() {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch {
    // O navegador pode bloquear armazenamento local.
  }
}

export function PwaInstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosVisible, setIosVisible] = useState(false);
  const [updateVisible, setUpdateVisible] = useState(false);
  const [waitingRegistration, setWaitingRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const hasReloadedRef = useRef(false);

  useEffect(() => {
    let promptTimer: number | undefined;

    const showPromptAfterDelay = (callback: () => void) => {
      window.clearTimeout(promptTimer);
      promptTimer = window.setTimeout(callback, PROMPT_DELAY_MS);
    };

    const handler = (e: Event) => {
      e.preventDefault();
      const prompt = e as BeforeInstallPromptEvent;
      setEvent(prompt);
      if (!wasRecentlyDismissed()) {
        showPromptAfterDelay(() => setVisible(true));
      }
    };

    const handleInstalled = () => {
      window.clearTimeout(promptTimer);
      setVisible(false);
      setEvent(null);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', handleInstalled);

    try {
      const ua = window.navigator.userAgent;
      const isIos = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
      const isSafari = /^((?!CriOS|FxiOS|EdgiOS|OPiOS).)*Safari/i.test(ua);
      if (isIos && isSafari && !isStandalone && !wasRecentlyDismissed()) {
        showPromptAfterDelay(() => setIosVisible(true));
      }
    } catch {
      // ignore UA detection errors
    }

    return () => {
      window.clearTimeout(promptTimer);
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const onControllerChange = () => {
      if (hasReloadedRef.current) return;
      hasReloadedRef.current = true;
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
    rememberDismissal();
  };

  const handleIosDismiss = () => {
    setIosVisible(false);
    rememberDismissal();
  };

  const handleUpdate = () => {
    const worker = waitingRegistration?.waiting;
    if (!worker) return;
    worker.postMessage('SKIP_WAITING');
    window.setTimeout(() => {
      if (hasReloadedRef.current) return;
      hasReloadedRef.current = true;
      window.location.reload();
    }, 1_500);
  };

  if (updateVisible) {
    return (
      <div
        className="safe-floating-toast fixed z-50 sm:max-w-sm animate-in slide-in-from-bottom-2"
        role="status"
      >
        <div className="surface-elevated flex items-start gap-3 rounded-lg border bg-card p-4 shadow-lg">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <RefreshCw className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Nova versão disponível</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Recarregue para usar a versão mais recente.
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
        className="safe-floating-toast fixed z-50 sm:max-w-sm animate-in slide-in-from-bottom-2"
        role="region"
        aria-label="Instalar aplicativo no iOS"
        aria-live="polite"
      >
        <div className="surface-elevated flex items-start gap-3 rounded-lg border bg-card p-4 shadow-lg">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <Share className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Instalar no iPhone ou iPad</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início.
            </p>
            <div className="mt-3">
              <Button size="sm" variant="ghost" onClick={handleIosDismiss}>
                Entendi
              </Button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleIosDismiss}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Fechar"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  if (!visible || !event) return null;

  return (
    <div
      className="safe-floating-toast fixed z-50 sm:max-w-sm animate-in slide-in-from-bottom-2"
      role="region"
      aria-label="Instalar aplicativo"
      aria-live="polite"
    >
      <div className="surface-elevated rounded-lg border bg-card p-4 shadow-lg flex items-start gap-3">
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
          type="button"
          onClick={handleDismiss}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Fechar"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

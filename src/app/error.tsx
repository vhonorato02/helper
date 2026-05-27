'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('app_render_error', { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" />
      </div>
      <h1 className="text-xl font-bold">Não foi possível carregar esta tela</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Tente novamente em alguns segundos. Se continuar acontecendo, avise a equipe interna.
      </p>
      <Button className="mt-5" onClick={reset}>
        Tentar novamente
      </Button>
    </div>
  );
}

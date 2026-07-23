'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalRootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-background text-foreground">
        <main
          className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-5 text-center"
          role="alert"
          aria-labelledby="root-error-title"
        >
          <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle className="size-6" aria-hidden="true" />
          </div>
          <h1 id="root-error-title" className="text-xl font-bold">
            O Helper não conseguiu iniciar
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tente novamente. Se a tela continuar indisponível, recarregue para buscar a versão
            mais recente.
          </p>
          {error.digest && (
            <p className="mt-3 font-mono text-xs text-muted-foreground">
              Código do erro: {error.digest}
            </p>
          )}
          <div className="mt-5 flex w-full flex-col justify-center gap-2 sm:flex-row">
            <Button onClick={reset}>
              <RefreshCw className="size-4" aria-hidden="true" />
              Tentar novamente
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Recarregar aplicativo
            </Button>
          </div>
        </main>
      </body>
    </html>
  );
}

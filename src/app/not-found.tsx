import Link from 'next/link';
import { ArrowLeft, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <SearchX className="size-5" />
      </div>
      <p className="section-label">Página não encontrada</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Não encontramos esse caminho.</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        O link pode ter mudado, ou a demanda pode ter sido removida.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">
          <ArrowLeft className="size-4" />
          Voltar ao início
        </Link>
      </Button>
    </main>
  );
}

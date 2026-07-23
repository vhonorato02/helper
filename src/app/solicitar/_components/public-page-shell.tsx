import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BrandMark } from '@/components/brand/brand-mark';

export function PublicPageShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="safe-public-screen bg-background">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header className="flex items-center justify-between gap-3">
          <Link href="/solicitar" className="flex items-center gap-2.5 rounded-lg">
            <BrandMark className="size-9 rounded-lg shadow-md shadow-primary/20" />
            <div>
              <p className="text-sm font-bold leading-tight">Helper</p>
              <p className="text-xs text-muted-foreground">{eyebrow}</p>
            </div>
          </Link>
          <Link href="/solicitar" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
        </header>

        <section className="page-hero">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </section>

        <section className="grid gap-2 rounded-lg border border-border/70 bg-muted/25 p-3 text-xs text-muted-foreground md:grid-cols-3">
          <p><span className="font-semibold text-foreground">Protocolo:</span> guarde o código exibido após o envio.</p>
          <p><span className="font-semibold text-foreground">Contato:</span> informe e-mail ou telefone para retorno.</p>
          <p><span className="font-semibold text-foreground">Triagem:</span> a equipe acompanha tudo na entrada externa.</p>
        </section>

        {children}
      </div>
    </div>
  );
}

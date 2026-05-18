'use client';

import { useState, useTransition } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2, TicketCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandMark } from '@/components/brand/brand-mark';
import { copy } from '@/lib/copy';

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const form = event.currentTarget;
    const username = (form.elements.namedItem('username') as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    startTransition(async () => {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(copy.auth.errors.invalidCredentials);
        return;
      }

      router.push('/');
      router.refresh();
    });
  };

  return (
    <div className="relative flex min-h-screen">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_80%_at_-10%_60%,color-mix(in_oklch,var(--success)_5%,transparent),transparent)]" />
        <div className="absolute inset-0 bg-dot-grid opacity-40" />
      </div>

      {/* Left branding panel — hidden on small screens */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-[40%] flex-col justify-between p-12 border-r border-border/50">
        <div className="flex items-center gap-3">
          <BrandMark className="size-10 rounded-xl shadow-lg shadow-primary/20" />
          <span className="font-semibold tracking-tight">{copy.brand.name}</span>
        </div>

        <div className="space-y-8">
          <div className="space-y-3">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-inset ring-primary/20">
              <TicketCheck className="size-7 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight leading-tight">
              Gestão de demandas<br />
              <span className="text-primary">simples e eficiente</span>
            </h1>
            <p className="text-muted-foreground leading-relaxed text-sm max-w-sm">
              Organize, acompanhe e resolva as demandas de TI e Marketing do{' '}
              {copy.brand.institution} em um único lugar.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Abertura rápida', desc: 'Crie tickets em segundos' },
              { label: 'Quadro Kanban', desc: 'Visualize o fluxo de trabalho' },
              { label: 'Histórico completo', desc: 'Rastreie cada mudança' },
              { label: 'Multiequipe', desc: 'TI e Marketing integrados' },
            ].map((feat) => (
              <div
                key={feat.label}
                className="rounded-lg border border-border/60 bg-card/60 p-3 backdrop-blur-sm"
              >
                <p className="text-xs font-semibold">{feat.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground/70">
          {copy.brand.institution} · {new Date().getFullYear()}
        </p>
      </div>

      {/* Right: login form */}
      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-[380px] space-y-8">
          {/* Mobile brand */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 font-bold text-base">
              {copy.brand.initials}
            </div>
            <div>
              <p className="font-semibold tracking-tight leading-tight">{copy.brand.name}</p>
              <p className="text-xs text-muted-foreground">{copy.brand.institution}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight">Bom ter você de volta</h2>
            <p className="text-sm text-muted-foreground">{copy.brand.restrictedAccess}</p>
          </div>

          <div className="surface-panel rounded-xl p-6">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-sm font-medium">
                  {copy.auth.labels.username}
                </Label>
                <Input
                  id="username"
                  name="username"
                  autoComplete="username"
                  autoFocus
                  placeholder={copy.auth.placeholders.username}
                  required
                  disabled={isPending}
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium">
                  {copy.auth.labels.password}
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder={copy.auth.placeholders.password}
                  required
                  disabled={isPending}
                  className="h-10"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-lg bg-destructive/8 px-3.5 py-3 text-sm text-destructive ring-1 ring-inset ring-destructive/18"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="mt-1 w-full h-10" disabled={isPending}>
                {isPending && <Loader2 className="animate-spin" />}
                {isPending ? copy.auth.buttons.pending : copy.auth.buttons.submit}
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-muted-foreground/60">
            Acesso exclusivo para colaboradores autorizados.
          </p>
        </div>
      </div>
    </div>
  );
}

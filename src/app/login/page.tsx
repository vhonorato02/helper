'use client';

import { useState, useTransition } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklch,var(--primary)_11%,transparent),transparent_34rem),linear-gradient(180deg,var(--background),color-mix(in_oklch,var(--muted)_70%,var(--background)))]" />

      <div className="w-full max-w-[400px]">
        <div className="surface-panel rounded-lg p-5 sm:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm shadow-primary/20">
              <Lock className="size-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight">{copy.brand.name}</h1>
              <p className="truncate text-xs text-muted-foreground">{copy.brand.restrictedAccess}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="username">{copy.auth.labels.username}</Label>
                <Input
                  id="username"
                  name="username"
                  autoComplete="username"
                  autoFocus
                  placeholder={copy.auth.placeholders.username}
                  required
                  disabled={isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">{copy.auth.labels.password}</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder={copy.auth.placeholders.password}
                  required
                  disabled={isPending}
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive ring-1 ring-inset ring-destructive/20"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="mt-2 w-full" size="lg" disabled={isPending}>
                {isPending && <Loader2 className="animate-spin" />}
                {isPending ? copy.auth.buttons.pending : copy.auth.buttons.submit}
              </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

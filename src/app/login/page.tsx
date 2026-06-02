'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import { loginAction } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandMark } from '@/components/brand/brand-mark';
import { copy } from '@/lib/copy';

function safeCallbackUrl(raw: string | null) {
  if (!raw) return '/';

  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return '/';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    setError('');
    setIsSubmitting(true);

    const username = (form.elements.namedItem('username') as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    try {
      const result = await loginAction({
        username,
        password,
      });

      if (result?.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      router.push(safeCallbackUrl(searchParams.get('callbackUrl')));
      router.refresh();
    } catch {
      setError(copy.validation.serverError);
      setIsSubmitting(false);
    }
  };

  const submitOnEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    event.preventDefault();
    formRef.current?.requestSubmit();
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center overflow-x-hidden px-4 py-10">
      <div className="w-full min-w-0 max-w-[calc(100vw-2rem)] sm:max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-3">
          <BrandMark className="size-10 rounded-lg shadow-md shadow-primary/20" />
          <h1 className="text-xl font-bold tracking-tight">{copy.brand.name}</h1>
        </div>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="surface-panel space-y-4 rounded-lg p-5 sm:p-6"
          aria-busy={isSubmitting}
        >
          <div className="space-y-1.5">
            <Label htmlFor="username">{copy.auth.labels.username}</Label>
            <Input
              ref={usernameRef}
              id="username"
              name="username"
              autoComplete="username"
              placeholder={copy.auth.placeholders.username}
              required
              disabled={isSubmitting}
              onKeyDown={submitOnEnter}
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
              disabled={isSubmitting}
              onKeyDown={submitOnEnter}
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

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            {isSubmitting ? copy.auth.buttons.pending : copy.auth.buttons.submit}
          </Button>
        </form>
      </div>
    </div>
  );
}

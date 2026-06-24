'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Copy, Eye, EyeOff, Loader2, Plus, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createUser } from '@/actions/users';
import { copy } from '@/lib/copy';

function generateTemporaryPassword() {
  const groups = [
    'ABCDEFGHJKLMNPQRSTUVWXYZ',
    'abcdefghijkmnopqrstuvwxyz',
    '23456789',
    '@#$%&*+-?',
  ];
  const all = groups.join('');
  const bytes = new Uint32Array(16);
  crypto.getRandomValues(bytes);

  const required = groups.map((group, index) => group[bytes[index] % group.length]);
  const rest = Array.from(bytes.slice(groups.length)).map((value) => all[value % all.length]);
  const password = [...required, ...rest];

  for (let index = password.length - 1; index > 0; index -= 1) {
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    const swapIndex = random[0] % (index + 1);
    [password[index], password[swapIndex]] = [password[swapIndex], password[index]];
  }

  return password.join('');
}

export function CreateUserForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const errorId = error ? 'create-user-error' : undefined;

  const handleGeneratePassword = () => {
    if (!passwordRef.current) return;
    passwordRef.current.value = generateTemporaryPassword();
    setShowPassword(true);
  };

  const handleCopyPassword = async () => {
    const value = passwordRef.current?.value;
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast.success(copy.users.form.copiedPassword);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createUser(formData);
      if (result && 'error' in result) {
        setError(result.error ?? copy.validation.createUserFailed);
        return;
      }

      const name = String(formData.get('displayName') ?? copy.users.roles.user);
      toast.success(copy.users.form.added(name));
      formRef.current?.reset();
      setShowPassword(false);
      router.refresh();
    });
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="surface-panel rounded-lg p-5 space-y-4">
      <div className="grid gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="username">{copy.users.form.username}</Label>
          <Input
            id="username"
            name="username"
            placeholder={copy.users.form.placeholders.username}
            pattern="[a-z0-9._-]+"
            title={copy.validation.usernamePattern}
            required
            disabled={isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="displayName">{copy.users.form.displayName}</Label>
          <Input
            id="displayName"
            name="displayName"
            placeholder={copy.users.form.placeholders.displayName}
            required
            disabled={isPending}
          />
        </div>
      </div>

      <div className="grid gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">{copy.users.form.password}</Label>
          <div className="relative">
            <Input
              ref={passwordRef}
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={copy.users.form.placeholders.password}
              minLength={10}
              required
              disabled={isPending}
              aria-describedby={errorId}
              aria-invalid={!!error}
              className="pr-20"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                disabled={isPending}
                className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 disabled:opacity-50"
                aria-label={showPassword ? copy.users.form.hidePassword : copy.users.form.showPassword}
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                onClick={handleCopyPassword}
                disabled={isPending}
                className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 disabled:opacity-50"
                aria-label={copy.users.form.copyPassword}
              >
                <Copy className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleGeneratePassword}
            disabled={isPending}
            className="gap-1.5"
          >
            <Wand2 className="size-4" />
            {copy.users.form.generatePassword}
          </Button>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          name="isAdmin"
          value="true"
          className="size-4 rounded border-input accent-primary cursor-pointer"
          disabled={isPending}
        />
        <span>{copy.users.form.isAdmin}</span>
      </label>

      {error && (
        <p
          id="create-user-error"
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive ring-1 ring-inset ring-destructive/20"
        >
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">{copy.users.form.helper}</p>
        <Button type="submit" disabled={isPending} className="gap-1.5 shrink-0">
          {isPending ? <Loader2 className="animate-spin" /> : <Plus />}
          {copy.users.form.add}
        </Button>
      </div>
    </form>
  );
}

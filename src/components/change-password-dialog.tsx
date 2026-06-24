'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { changePassword } from '@/actions/users';
import { copy } from '@/lib/copy';

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  targetUserName: string;
  isSelf?: boolean;
  forceMode?: boolean;
  onSuccess?: () => void;
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
  targetUserId,
  targetUserName,
  isSelf = false,
  forceMode = false,
  onSuccess,
}: ChangePasswordDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!open) {
      setError('');
      setShow(false);
      formRef.current?.reset();
    }
  }, [open]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const formData = new FormData(event.currentTarget);
    const newPassword = String(formData.get('newPassword') ?? '');
    const confirmPassword = String(formData.get('confirmPassword') ?? '');

    if (newPassword.length < 10) {
      setError(copy.validation.passwordTooShort);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(copy.validation.passwordMismatch);
      return;
    }

    formData.append('userId', targetUserId);

    startTransition(async () => {
      try {
        const result = await changePassword(formData);
        if (result && 'error' in result) {
          setError(result.error ?? copy.validation.passwordFailed);
          return;
        }

        toast.success(
          isSelf ? copy.users.password.selfUpdated : copy.users.password.userUpdated(targetUserName),
        );
        onOpenChange(false);
        onSuccess?.();
      } catch {
        setError(copy.validation.passwordFailed);
      }
    });
  };

  const errorId = error ? 'password-change-error' : undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (isPending) return;
        if (forceMode && !value) return;
        onOpenChange(value);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <KeyRound className="size-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle>{isSelf ? copy.users.password.changeMine : copy.users.password.reset}</DialogTitle>
              <DialogDescription className="mt-1">
                {isSelf
                  ? copy.users.password.descriptionSelf
                  : copy.users.password.descriptionUser(targetUserName)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} aria-busy={isPending} className="space-y-4">
          {isSelf && (
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">{copy.users.password.currentPassword}</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type={show ? 'text' : 'password'}
                placeholder={copy.users.password.currentPlaceholder}
                autoComplete="current-password"
                required
                aria-describedby={errorId}
                aria-invalid={!!error}
                disabled={isPending}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="newPassword">{copy.users.password.newPassword}</Label>
            <div className="relative">
              <Input
                id="newPassword"
                name="newPassword"
                type={show ? 'text' : 'password'}
                placeholder={copy.users.password.placeholder}
                minLength={10}
                autoComplete="new-password"
                required
                aria-describedby={errorId}
                aria-invalid={!!error}
                disabled={isPending}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShow((value) => !value)}
                disabled={isPending}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                aria-label={show ? copy.users.form.hidePassword : copy.users.form.showPassword}
              >
                {show ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">{copy.users.password.confirmPassword}</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={show ? 'text' : 'password'}
              placeholder={copy.users.password.confirmPlaceholder}
              minLength={10}
              autoComplete="new-password"
              required
              aria-describedby={errorId}
              aria-invalid={!!error}
              disabled={isPending}
            />
          </div>

          {error && (
            <p
              id="password-change-error"
              role="alert"
              className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg ring-1 ring-inset ring-destructive/20"
            >
              {error}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-2 pt-2">
            {!forceMode && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                {copy.common.cancel}
              </Button>
            )}
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              {copy.users.password.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Pencil } from 'lucide-react';
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
import { OperationalProfileFields } from '@/components/users/operational-profile-fields';
import { updateUser } from '@/actions/users';
import { copy } from '@/lib/copy';
import type { User } from '@/db/schema';

type UserItem = Pick<User, 'id' | 'username' | 'displayName' | 'role' | 'area' | 'avatarUrl' | 'isAdmin'>;

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserItem;
  isSelf: boolean;
}

export function EditUserDialog({ open, onOpenChange, user, isSelf }: EditUserDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!open) setError('');
  }, [open]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const formData = new FormData(event.currentTarget);
    formData.set('userId', user.id);

    startTransition(async () => {
      const result = await updateUser(formData);
      if (result && 'error' in result) {
        setError(result.error ?? copy.validation.invalidData);
        return;
      }

      toast.success(copy.users.list.updated(String(formData.get('displayName') ?? user.displayName)));
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !isPending && onOpenChange(value)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <Pencil className="size-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle>{copy.users.editDialog.title}</DialogTitle>
              <DialogDescription className="mt-1">
                {copy.users.editDialog.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-username">{copy.users.form.username}</Label>
            <Input
              id="edit-username"
              name="username"
              defaultValue={user.username}
              pattern="[a-z0-9._-]+"
              title={copy.validation.usernamePattern}
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-display-name">{copy.users.form.displayName}</Label>
            <Input
              id="edit-display-name"
              name="displayName"
              defaultValue={user.displayName}
              required
              disabled={isPending}
            />
          </div>

          <OperationalProfileFields
            idPrefix={`edit-user-${user.id}`}
            initialRole={user.role}
            initialArea={user.area}
            disabled={isPending}
          />

          <div className="space-y-1.5">
            <Label htmlFor="edit-avatar-url">Avatar</Label>
            <Input
              id="edit-avatar-url"
              name="avatarUrl"
              type="url"
              defaultValue={user.avatarUrl ?? ''}
              placeholder="https://..."
              maxLength={300}
              disabled={isPending}
            />
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            {isSelf && user.isAdmin && <input type="hidden" name="isAdmin" value="true" />}
            <input
              type="checkbox"
              name="isAdmin"
              value="true"
              defaultChecked={user.isAdmin}
              disabled={isPending || isSelf}
              className="size-4 rounded border-input accent-primary cursor-pointer disabled:cursor-not-allowed"
            />
            <span>{copy.users.form.isAdmin}</span>
          </label>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg ring-1 ring-inset ring-destructive/20">
              {error}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {copy.common.cancel}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              {copy.users.editDialog.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

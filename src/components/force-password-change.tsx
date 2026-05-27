'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound } from 'lucide-react';
import { ChangePasswordDialog } from '@/components/change-password-dialog';
import { Button } from '@/components/ui/button';
import { copy } from '@/lib/copy';

interface ForcePasswordChangeProps {
  userId: string;
  displayName: string;
}

export function ForcePasswordChange({ userId, displayName }: ForcePasswordChangeProps) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  return (
    <div className="surface-panel rounded-lg p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <KeyRound className="size-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{displayName}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {copy.users.account.passwordDescription}
          </p>
          <Button className="mt-4" size="sm" onClick={() => setOpen(true)}>
            {copy.users.account.changePassword}
          </Button>
        </div>
      </div>
      <ChangePasswordDialog
        open={open}
        onOpenChange={setOpen}
        targetUserId={userId}
        targetUserName={displayName}
        isSelf
        forceMode
        onSuccess={() => router.replace('/')}
      />
    </div>
  );
}

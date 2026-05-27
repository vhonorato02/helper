'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export function PasswordChangeGuard({ mustChangePassword }: { mustChangePassword: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (mustChangePassword && pathname !== '/alterar-senha') {
      router.replace('/alterar-senha');
    }
  }, [mustChangePassword, pathname, router]);

  return null;
}

'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast:
              'group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-lg',
            description: 'group-[.toast]:text-muted-foreground',
            actionButton:
              'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
            cancelButton:
              'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
            success: 'group-[.toaster]:!border-l-4 group-[.toaster]:!border-l-green-500',
            error: 'group-[.toaster]:!border-l-4 group-[.toaster]:!border-l-destructive',
            warning: 'group-[.toaster]:!border-l-4 group-[.toaster]:!border-l-amber-500',
            info: 'group-[.toaster]:!border-l-4 group-[.toaster]:!border-l-primary',
          },
        }}
        closeButton
        duration={3500}
      />
    </SessionProvider>
  );
}

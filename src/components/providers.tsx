'use client';

import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="bottom-right"
        offset={{
          right: 'max(1rem, env(safe-area-inset-right))',
          bottom: 'max(1rem, env(safe-area-inset-bottom))',
        }}
        mobileOffset={{
          left: 'max(1rem, env(safe-area-inset-left))',
          right: 'max(1rem, env(safe-area-inset-right))',
          bottom: 'max(1rem, env(safe-area-inset-bottom))',
        }}
        containerAriaLabel="Notificações"
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
    </>
  );
}

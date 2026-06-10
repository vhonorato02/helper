import * as React from 'react';
import { cn } from '@/lib/utils';

interface FilterFieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}

const labelClass =
  'block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground';

export function FilterField({ label, children, className, htmlFor }: FilterFieldProps) {
  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      {htmlFor ? (
        <label htmlFor={htmlFor} className={labelClass}>
          {label}
        </label>
      ) : (
        <span className={labelClass}>{label}</span>
      )}
      {children}
    </div>
  );
}

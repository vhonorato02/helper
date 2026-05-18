import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold leading-5 transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary ring-1 ring-inset ring-primary/25',
        secondary: 'bg-muted text-muted-foreground ring-1 ring-inset ring-border/80',
        destructive: 'bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/30',
        outline: 'text-foreground ring-1 ring-inset ring-border',
        success: 'bg-green-500/10 text-green-700 dark:text-green-400 ring-1 ring-inset ring-green-500/30',
        warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 ring-1 ring-inset ring-amber-500/30',
        orange: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 ring-1 ring-inset ring-orange-500/30',
        solid: 'bg-primary text-primary-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

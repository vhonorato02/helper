import { cn } from '@/lib/utils';

interface BrandMarkProps {
  className?: string;
  /** Render with a soft glow halo. */
  glow?: boolean;
  /** Hide the gold accent dot (e.g. small sizes < 24px). */
  hideAccent?: boolean;
  title?: string;
}

/**
 * The TicketAnglo brand mark — a stylized "A" with a gold accent dot.
 * Rendered as inline SVG so it scales crisply and respects currentColor on demand.
 */
export function BrandMark({ className, glow = false, hideAccent = false, title }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('block', className)}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <linearGradient id="brand-mark-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e3a8a" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        {glow && (
          <filter id="brand-mark-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>
      <rect
        width="64"
        height="64"
        rx="14"
        fill="url(#brand-mark-bg)"
        filter={glow ? 'url(#brand-mark-glow)' : undefined}
      />
      <path
        d="M16 47 L32 17 L48 47 M22.5 37.5 H41.5"
        stroke="#ffffff"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {!hideAccent && <circle cx="46" cy="20" r="4" fill="#fbbf24" />}
    </svg>
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-baseline font-bold tracking-tight', className)}>
      Ticket<span className="text-primary">Anglo</span>
    </span>
  );
}

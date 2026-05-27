import { cn } from '@/lib/utils';
import { BRAND } from '@/lib/brand';

interface BrandMarkProps {
  className?: string;
  /** Render with a soft glow halo. */
  glow?: boolean;
  /** Keep compact marks visually calm at very small sizes. */
  hideAccent?: boolean;
  title?: string;
}

/**
 * The Helper brand mark: a neutral, compact "H" built for app icons and dense UI.
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
          <stop offset="0%" stopColor={BRAND.black} />
          <stop offset="100%" stopColor={BRAND.graphite} />
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
        d="M21 16 V48 M43 16 V48 M21 32 H43"
        stroke="#ffffff"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {!hideAccent && <circle cx="50" cy="14" r="3" fill={BRAND.white} opacity="0.82" />}
    </svg>
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-baseline font-bold tracking-tight', className)}>
      Helper
    </span>
  );
}

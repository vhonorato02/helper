import { Skeleton } from '@/components/ui/skeleton';

export default function TicketsLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

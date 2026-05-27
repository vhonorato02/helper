import { Skeleton } from '@/components/ui/skeleton';

export default function SchedulesLoading() {
  return (
    <div className="space-y-7">
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

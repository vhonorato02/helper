import { Skeleton } from '@/components/ui/skeleton';

export default function ActivityLoading() {
  return (
    <div className="space-y-7">
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

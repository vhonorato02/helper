import { Skeleton } from '@/components/ui/skeleton';

export default function KanbanLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full rounded-lg" />
      <div className="flex gap-3 overflow-x-auto">
        {Array.from({ length: 4 }).map((_, col) => (
          <div key={col} className="w-[300px] shrink-0 space-y-2">
            <Skeleton className="h-8 w-full rounded-md" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

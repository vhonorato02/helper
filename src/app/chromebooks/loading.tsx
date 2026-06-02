import { Skeleton } from '@/components/ui/skeleton';

export default function ChromebooksLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 rounded-lg" />
      <div className="grid gap-3 sm:grid-cols-4">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
      <Skeleton className="h-96 rounded-lg" />
    </div>
  );
}

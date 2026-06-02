import { Skeleton } from '@/components/ui/skeleton';

export default function PublicChromebookRequestLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10">
      <Skeleton className="h-16 rounded-lg" />
      <Skeleton className="h-[520px] rounded-lg" />
    </div>
  );
}

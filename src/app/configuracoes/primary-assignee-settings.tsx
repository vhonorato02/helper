'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Loader2, Save, UserCheck } from 'lucide-react';
import { setPrimaryAssigneeForArea } from '@/actions/users';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AREA_LABELS, type Area } from '@/lib/constants';
import { copy } from '@/lib/copy';

type PrimaryAssigneeSetting = {
  area: Area;
  primaryUserId: string | null;
  updatedByName: string | null;
  eligibleUsers: Array<{ id: string; displayName: string }>;
};

interface PrimaryAssigneeSettingsProps {
  settings: PrimaryAssigneeSetting[];
}

export function PrimaryAssigneeSettings({ settings }: PrimaryAssigneeSettingsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const area = String(formData.get('area') ?? '') as Area;

    startTransition(async () => {
      const result = await setPrimaryAssigneeForArea(formData);
      if (result && 'error' in result) {
        toast.error(result.error);
        return;
      }

      toast.success(copy.users.primaryAssignee.saved(AREA_LABELS[area]));
      router.refresh();
    });
  };

  return (
    <section className="surface-panel rounded-lg p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <UserCheck className="size-4 text-primary" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{copy.users.primaryAssignee.title}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {copy.users.primaryAssignee.description}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {settings.map((setting) => (
          <form key={setting.area} onSubmit={handleSubmit} className="space-y-2">
            <input type="hidden" name="area" value={setting.area} />
            <Label htmlFor={`primary-assignee-${setting.area}`}>
              {copy.users.primaryAssignee.areaLabel(AREA_LABELS[setting.area])}
            </Label>
            <div className="flex gap-2">
              <select
                id={`primary-assignee-${setting.area}`}
                name="primaryUserId"
                defaultValue={setting.primaryUserId ?? ''}
                disabled={isPending}
                className="flex h-10 min-w-0 flex-1 rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55"
              >
                <option value="">{copy.users.primaryAssignee.none}</option>
                {setting.eligibleUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.displayName}
                  </option>
                ))}
              </select>
              <Button type="submit" size="icon" disabled={isPending} aria-label={copy.common.save}>
                {isPending ? <Loader2 className="animate-spin" /> : <Save />}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {setting.updatedByName
                ? copy.users.primaryAssignee.updatedBy(setting.updatedByName)
                : copy.users.primaryAssignee.notConfigured}
            </p>
          </form>
        ))}
      </div>
    </section>
  );
}

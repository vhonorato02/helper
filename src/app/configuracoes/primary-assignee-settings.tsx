'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Loader2, Save, UserCheck } from 'lucide-react';
import { setPrimaryAssigneeForArea } from '@/actions/users';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

function PrimaryAssigneeAreaForm({ setting }: { setting: PrimaryAssigneeSetting }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const knownPrimary = setting.eligibleUsers.some((user) => user.id === setting.primaryUserId);
  const defaultPrimaryUserId = knownPrimary ? setting.primaryUserId : null;
  const [selectedUserId, setSelectedUserId] = useState(defaultPrimaryUserId ?? 'none');
  const areaLabel = AREA_LABELS[setting.area];
  const fieldId = `primary-assignee-${setting.area}`;
  const helperId = `${fieldId}-helper`;
  const statusId = `${fieldId}-status`;

  useEffect(() => {
    setSelectedUserId(defaultPrimaryUserId ?? 'none');
  }, [defaultPrimaryUserId]);

  const selectedUserName = useMemo(
    () => setting.eligibleUsers.find((user) => user.id === selectedUserId)?.displayName ?? null,
    [selectedUserId, setting.eligibleUsers],
  );
  const effectDescription = selectedUserName
    ? copy.users.primaryAssignee.selectionEffect(selectedUserName, areaLabel)
    : copy.users.primaryAssignee.noneEffect(areaLabel);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (formData.get('primaryUserId') === 'none') formData.set('primaryUserId', '');

    startTransition(async () => {
      const result = await setPrimaryAssigneeForArea(formData);
      if (result && 'error' in result) {
        toast.error(result.error);
        return;
      }

      toast.success(copy.users.primaryAssignee.saved(areaLabel));
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input type="hidden" name="area" value={setting.area} />
      <Label htmlFor={fieldId}>{copy.users.primaryAssignee.areaLabel(areaLabel)}</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select
          name="primaryUserId"
          value={selectedUserId}
          onValueChange={setSelectedUserId}
          disabled={isPending}
        >
          <SelectTrigger id={fieldId} aria-describedby={`${helperId} ${statusId}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{copy.users.primaryAssignee.none}</SelectItem>
            {setting.eligibleUsers.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="submit"
          disabled={isPending}
          aria-label={copy.users.primaryAssignee.saveArea(areaLabel)}
          className="gap-1.5 sm:w-auto"
        >
          {isPending ? <Loader2 className="animate-spin" /> : <Save />}
          <span>{copy.common.save}</span>
        </Button>
      </div>
      <p id={helperId} className="text-xs leading-relaxed text-muted-foreground">
        {effectDescription}
      </p>
      <p id={statusId} className="text-[11px] text-muted-foreground">
        {setting.updatedByName
          ? copy.users.primaryAssignee.updatedBy(setting.updatedByName)
          : copy.users.primaryAssignee.notConfigured}
      </p>
    </form>
  );
}

export function PrimaryAssigneeSettings({ settings }: PrimaryAssigneeSettingsProps) {
  const hasEligibleUsers = settings.some((setting) => setting.eligibleUsers.length > 0);

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

      {!hasEligibleUsers && (
        <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {copy.users.primaryAssignee.noEligibleUsers}
        </p>
      )}

      <div className="space-y-3">
        {settings.map((setting) => (
          <PrimaryAssigneeAreaForm key={setting.area} setting={setting} />
        ))}
      </div>
    </section>
  );
}

'use client';

import { useState } from 'react';
import {
  BellRing,
  BriefcaseBusiness,
  KeyRound,
  MapPinned,
  ShieldCheck,
  User as UserIcon,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ChangePasswordDialog } from '@/components/change-password-dialog';
import { copy } from '@/lib/copy';
import { initials } from '@/lib/format';
import { AREA_LABELS, USER_ROLE_LABELS, type Area, type UserRole } from '@/lib/constants';
import { BrowserNotificationPermissionPanel } from '@/components/notifications/browser-notification-agent';
import {
  NotificationPreferencesForm,
} from './notification-preferences-form';
import type { NotificationPreferences } from '@/actions/notifications';

interface AccountSettingsProps {
  userId: string;
  username: string;
  displayName: string;
  role: string | null;
  areas: Area[];
  avatarUrl?: string | null;
  isAdmin: boolean;
  primaryAssignees: Array<{ area: Area; id: string | null; displayName: string | null }>;
  notificationPreferences: NotificationPreferences;
}

function isKnownRole(value: string | null | undefined): value is UserRole {
  return Boolean(value && value in USER_ROLE_LABELS);
}

export function AccountSettings({
  userId,
  username,
  displayName,
  role,
  areas,
  avatarUrl,
  isAdmin,
  primaryAssignees,
  notificationPreferences,
}: AccountSettingsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const name = displayName || copy.dashboard.greeting.fallbackName;
  const roleLabel = isKnownRole(role) ? USER_ROLE_LABELS[role] : copy.common.none;
  const areaLabel = areas.length > 0
    ? areas.map((area) => AREA_LABELS[area]).join(', ')
    : copy.common.none;
  const primaryAssigneeDescription = primaryAssignees.length > 0
    ? primaryAssignees
        .map((item) =>
          item.id === userId
            ? copy.users.account.primaryAssigneeYou(AREA_LABELS[item.area])
            : item.displayName
              ? copy.users.account.primaryAssigneePerson(item.displayName, AREA_LABELS[item.area])
              : copy.users.account.primaryAssigneeNoneForArea(AREA_LABELS[item.area]),
        )
        .join(' ')
    : copy.users.account.primaryAssigneeNoArea;

  return (
    <>
      <div className="surface-panel rounded-lg p-5">
        <div className="flex items-center gap-4">
          <Avatar className="size-12">
            {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold">{name}</p>
            <p className="text-sm text-muted-foreground">@{username}</p>
            <div className="flex items-center gap-1.5 mt-1">
              {isAdmin ? (
                <Badge variant="default" className="gap-1">
                  <ShieldCheck className="size-3" />
                  {copy.users.roles.admin}
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <UserIcon className="size-3" />
                  {copy.users.roles.user}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <section className="surface-panel rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
              <UserIcon className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">{copy.users.account.identityTitle}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{copy.users.account.identityDescription}</p>
            </div>
          </div>
        </section>

        <section className="surface-panel rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
              <BriefcaseBusiness className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">{copy.users.account.roleTitle}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{roleLabel}</p>
            </div>
          </div>
        </section>

        <section className="surface-panel rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
              <MapPinned className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">{copy.users.account.areaTitle}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{areaLabel}</p>
            </div>
          </div>
        </section>

        <section className="surface-panel rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
              <ShieldCheck className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">{copy.users.account.permissionsTitle}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {isAdmin ? copy.users.roles.admin : copy.users.roles.user}
              </p>
            </div>
          </div>
        </section>

        <section className="surface-panel rounded-lg p-4 md:col-span-2 xl:col-span-1">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
              <UserCheck className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">{copy.users.account.primaryAssigneeTitle}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{primaryAssigneeDescription}</p>
            </div>
          </div>
        </section>
      </div>

      <div className="surface-panel rounded-lg p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
              <KeyRound className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h3 className="font-medium">{copy.users.account.passwordTitle}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {copy.users.account.passwordDescription}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            {copy.users.account.changePassword}
          </Button>
        </div>
      </div>

      <div className="surface-panel rounded-lg p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
            <BellRing className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">{copy.users.account.integrationsTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {copy.users.account.integrationsDescription({
                emailEnabled: notificationPreferences.emailEnabled,
                browserEnabled: notificationPreferences.browserEnabled,
              })}
            </p>
          </div>
        </div>
      </div>

      <BrowserNotificationPermissionPanel />
      <NotificationPreferencesForm preferences={notificationPreferences} />

      <ChangePasswordDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        targetUserId={userId}
        targetUserName={name}
        isSelf
      />
    </>
  );
}

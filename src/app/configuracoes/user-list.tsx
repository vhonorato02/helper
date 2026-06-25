'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  KeyRound,
  MoreVertical,
  Pencil,
  Shield,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserCog,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ChangePasswordDialog } from '@/components/change-password-dialog';
import { deleteUser, setUserAdmin, toggleUserActive } from '@/actions/users';
import { copy } from '@/lib/copy';
import { DATE_FORMATS, formatPtBrDate, initials } from '@/lib/format';
import { AREA_LABELS, USER_ROLE_LABELS, type UserRole } from '@/lib/constants';
import { EditUserDialog } from './edit-user-dialog';
import type { User } from '@/db/schema';

type UserItem = Pick<
  User,
  'id' | 'username' | 'displayName' | 'role' | 'area' | 'avatarUrl' | 'isAdmin' | 'isActive' | 'createdAt'
>;

interface UserListProps {
  users: UserItem[];
  currentUserId: string;
}

type ConfirmState =
  | { type: 'toggle'; user: UserItem }
  | { type: 'delete'; user: UserItem }
  | { type: 'role'; user: UserItem; nextAdmin: boolean };

function getConfirmContent(state: ConfirmState | null) {
  if (!state) {
    return { title: '', description: '', confirmLabel: copy.common.confirm, destructive: false };
  }

  if (state.type === 'delete') {
    return {
      title: copy.users.list.deleteTitle(state.user.displayName),
      description: copy.users.list.deleteDescription,
      confirmLabel: copy.users.list.delete,
      destructive: true,
    };
  }

  if (state.type === 'role') {
    return {
      title: copy.users.list.roleTitle(state.user.displayName, state.user.isAdmin),
      description: copy.users.list.roleDescription,
      confirmLabel: state.nextAdmin ? copy.users.list.makeAdmin : copy.users.list.removeAdmin,
      destructive: !state.nextAdmin,
    };
  }

  return {
    title: copy.users.list.deactivateTitle(state.user.displayName),
    description: copy.users.list.deactivateDescription,
    confirmLabel: state.user.isActive ? copy.users.list.deactivate : copy.users.list.reactivate,
    destructive: state.user.isActive,
  };
}

export function UserList({ users, currentUserId }: UserListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<UserItem | null>(null);
  const [editTarget, setEditTarget] = useState<UserItem | null>(null);

  const refreshAfter = (message: string) => {
    toast.success(message);
    setConfirmState(null);
    router.refresh();
  };

  const handleToggle = (user: UserItem) => {
    startTransition(async () => {
      const result = await toggleUserActive(user.id);
      if (result && 'error' in result) {
        toast.error(result.error);
        return;
      }

      refreshAfter(
        user.isActive
          ? copy.users.list.deactivated(user.displayName)
          : copy.users.list.reactivated(user.displayName),
      );
    });
  };

  const handleDelete = (user: UserItem) => {
    startTransition(async () => {
      const result = await deleteUser(user.id);
      if (result && 'error' in result) {
        toast.error(result.error);
        return;
      }

      refreshAfter(copy.users.list.deleted(user.displayName));
    });
  };

  const handleRole = (user: UserItem, nextAdmin: boolean) => {
    startTransition(async () => {
      const result = await setUserAdmin(user.id, nextAdmin);
      if (result && 'error' in result) {
        toast.error(result.error);
        return;
      }

      refreshAfter(
        nextAdmin
          ? copy.users.list.adminGranted(user.displayName)
          : copy.users.list.adminRevoked(user.displayName),
      );
    });
  };

  const handleConfirm = () => {
    if (!confirmState) return;
    if (confirmState.type === 'delete') handleDelete(confirmState.user);
    if (confirmState.type === 'toggle') handleToggle(confirmState.user);
    if (confirmState.type === 'role') handleRole(confirmState.user, confirmState.nextAdmin);
  };

  const confirmContent = getConfirmContent(confirmState);

  return (
    <>
      <div className="surface-elevated overflow-hidden rounded-lg divide-y divide-border/60">
        {users.map((user) => {
          const isSelf = user.id === currentUserId;
          const roleLabel = user.role
            ? USER_ROLE_LABELS[user.role as UserRole] ?? user.role
            : null;
          return (
            <div
              key={user.id}
              className={`flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-muted/30 ${
                !user.isActive ? 'opacity-60' : ''
              }`}
            >
              <Avatar className="size-9 shrink-0">
                {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
                <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                  {initials(user.displayName)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm truncate">{user.displayName}</span>
                  {user.isAdmin && (
                    <Badge variant="default" className="gap-1">
                      <ShieldCheck className="size-3" />
                      {copy.users.roles.adminShort}
                    </Badge>
                  )}
                  {roleLabel && <Badge variant="outline">{roleLabel}</Badge>}
                  {user.area && <Badge variant="secondary">{AREA_LABELS[user.area]}</Badge>}
                  {!user.isActive && <Badge variant="outline">{copy.users.status.inactive}</Badge>}
                  {isSelf && <Badge variant="secondary">{copy.users.status.you}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {copy.users.status.joinedAt(
                    user.username,
                    formatPtBrDate(user.createdAt, DATE_FORMATS.monthYear),
                  )}
                </p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={copy.users.list.actionsFor(user.displayName)}
                    disabled={isPending}
                  >
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onSelect={() => setEditTarget(user)}>
                    <Pencil className="size-4" />
                    {copy.users.list.edit}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setPasswordTarget(user)}>
                    <KeyRound className="size-4" />
                    {copy.users.list.resetPassword}
                  </DropdownMenuItem>
                  {!isSelf && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() =>
                          setConfirmState({ type: 'role', user, nextAdmin: !user.isAdmin })
                        }
                      >
                        {user.isAdmin ? (
                          <UserCog className="size-4" />
                        ) : (
                          <ShieldCheck className="size-4" />
                        )}
                        {user.isAdmin ? copy.users.list.removeAdmin : copy.users.list.makeAdmin}
                      </DropdownMenuItem>
                      {user.isActive ? (
                        <DropdownMenuItem
                          onSelect={() => setConfirmState({ type: 'toggle', user })}
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                          <ShieldOff className="size-4" />
                          {copy.users.list.deactivate}
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onSelect={() => setConfirmState({ type: 'toggle', user })}>
                          <Shield className="size-4" />
                          {copy.users.list.reactivate}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() => setConfirmState({ type: 'delete', user })}
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <Trash2 className="size-4" />
                        {copy.users.list.delete}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!confirmState}
        onOpenChange={(open) => !open && setConfirmState(null)}
        title={confirmContent.title}
        description={confirmContent.description}
        confirmLabel={confirmContent.confirmLabel}
        variant={confirmContent.destructive ? 'destructive' : 'default'}
        onConfirm={handleConfirm}
      />

      {passwordTarget && (
        <ChangePasswordDialog
          open={!!passwordTarget}
          onOpenChange={(open) => !open && setPasswordTarget(null)}
          targetUserId={passwordTarget.id}
          targetUserName={passwordTarget.displayName}
          isSelf={passwordTarget.id === currentUserId}
        />
      )}

      {editTarget && (
        <EditUserDialog
          open={!!editTarget}
          onOpenChange={(open) => !open && setEditTarget(null)}
          user={editTarget}
          isSelf={editTarget.id === currentUserId}
        />
      )}
    </>
  );
}

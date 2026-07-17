export type ChromebookPermissionUser = {
  isAdmin?: boolean | null;
};

export function canManageChromebookBookings(user: ChromebookPermissionUser | null | undefined) {
  return user?.isAdmin === true;
}

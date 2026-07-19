export type NotificationNavigationIntent = {
  altKey?: boolean;
  button?: number;
  ctrlKey?: boolean;
  defaultPrevented?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  target?: string | null;
};

export function shouldHandleNotificationNavigation(intent: NotificationNavigationIntent) {
  if (intent.defaultPrevented) return false;
  if ((intent.button ?? 0) !== 0) return false;
  if (intent.altKey || intent.ctrlKey || intent.metaKey || intent.shiftKey) return false;

  const target = intent.target?.trim().toLowerCase();
  return !target || target === '_self';
}

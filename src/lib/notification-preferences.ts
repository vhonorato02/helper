export const DEFAULT_NOTIFICATION_PREFERENCES = {
  ticketCreated: true,
  ticketStatus: true,
  commentMention: true,
  dailyDigest: true,
  emailEnabled: true,
  browserEnabled: true,
  reminderLeadMinutes: 30,
};

export type NotificationPreferencesShape = typeof DEFAULT_NOTIFICATION_PREFERENCES;
export type NotificationEventPreferenceKey = Extract<
  keyof NotificationPreferencesShape,
  'ticketCreated' | 'ticketStatus' | 'commentMention' | 'dailyDigest'
>;

export function preferenceForNotificationType(
  type: string,
): NotificationEventPreferenceKey | null {
  if (type.includes('status')) return 'ticketStatus';
  if (type.includes('mention') || type.includes('comment')) return 'commentMention';
  if (type.includes('digest')) return 'dailyDigest';
  if (type.includes('ticket') || type.includes('request')) return 'ticketCreated';
  return null;
}

export function isNotificationTypeEnabledForAlerts(
  type: string,
  preferences: Pick<NotificationPreferencesShape, NotificationEventPreferenceKey>,
) {
  const preferenceKey = preferenceForNotificationType(type);
  return preferenceKey ? Boolean(preferences[preferenceKey]) : true;
}

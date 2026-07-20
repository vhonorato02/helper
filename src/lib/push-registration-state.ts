export type PushPanelStatus = 'loading' | 'unsupported' | 'unconfigured' | 'denied' | 'active' | 'expired';

export type BrowserPushCapabilities = {
  notification: boolean;
  serviceWorker: boolean;
  pushManager: boolean;
};

export type PushRegistrationSnapshot = {
  permission: NotificationPermission | 'unsupported';
  publicKey: string | null;
  hasSubscription: boolean;
  currentEndpointRegistered: boolean;
  subscriptionExpired: boolean;
};

export function supportsBrowserPush(capabilities: BrowserPushCapabilities) {
  return capabilities.notification && capabilities.serviceWorker && capabilities.pushManager;
}

export function resolvePushPanelStatus(snapshot: PushRegistrationSnapshot): PushPanelStatus {
  if (snapshot.permission === 'unsupported') return 'unsupported';
  if (snapshot.permission === 'denied') return 'denied';
  if (!snapshot.publicKey) return 'unconfigured';
  if (snapshot.subscriptionExpired) return 'expired';
  if (snapshot.hasSubscription && snapshot.currentEndpointRegistered) return 'active';
  return 'expired';
}

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const actionSource = readFileSync(new URL('../src/actions/notifications.ts', import.meta.url), 'utf8');
const maintenanceSource = readFileSync(new URL('../src/lib/notification-maintenance.ts', import.meta.url), 'utf8');
const cronSource = readFileSync(new URL('../src/app/api/cron/morning/route.ts', import.meta.url), 'utf8');

describe('notification retention authorization boundary', () => {
  it('does not expose global deletion through a client-callable server action', () => {
    assert.doesNotMatch(actionSource, /\bpruneReadNotifications\b/);
    assert.match(maintenanceSource, /export async function pruneReadNotifications\(/);
    assert.match(maintenanceSource, /\.delete\(notifications\)/);
  });

  it('invokes maintenance only through the authorized cron route', () => {
    assert.match(cronSource, /from ['"]@\/lib\/notification-maintenance['"]/);
    assert.match(cronSource, /const denied = assertCron\(req\);/);
    assert.match(cronSource, /if \(denied\) return denied;/);
  });
});

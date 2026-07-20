import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { runCronTasks } from '@/lib/cron-runner';

describe('cron task runner', () => {
  it('runs later tasks even when an earlier task fails', async () => {
    const calls: string[] = [];

    const tasks = [
      {
        name: 'first',
        run: async () => {
          calls.push('first');
          throw new Error('first failed');
        },
      },
      {
        name: 'second',
        run: async () => {
          calls.push('second');
          return { sent: 1 };
        },
      },
    ];

    const result = await runCronTasks(tasks, { onTaskError: () => undefined });

    assert.deepEqual(calls, ['first', 'second']);
    assert.equal(result.ok, false);
    assert.deepEqual(result.results.first, { ok: false, error: 'first failed' });
    assert.deepEqual(result.results.second, { ok: true, value: { sent: 1 } });
  });
});

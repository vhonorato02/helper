import { logger } from '@/lib/logger';

export type CronTask = {
  name: string;
  run: () => Promise<unknown>;
};

export type CronTaskResult =
  | {
      ok: true;
      value: unknown;
    }
  | {
      ok: false;
      error: string;
    };

export type CronRunResult = {
  ok: boolean;
  results: Record<string, CronTaskResult>;
};

type CronRunOptions = {
  onTaskError?: (taskName: string, error: unknown) => void;
};

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'unknown_error';
}

export async function runCronTasks(
  tasks: readonly CronTask[],
  options: CronRunOptions = {},
): Promise<CronRunResult> {
  const results: Record<string, CronTaskResult> = {};
  const onTaskError =
    options.onTaskError ??
    ((taskName: string, error: unknown) => {
      logger.error('cron_task_failed', { task: taskName, error });
    });

  for (const task of tasks) {
    try {
      results[task.name] = { ok: true, value: await task.run() };
    } catch (error) {
      onTaskError(task.name, error);
      results[task.name] = { ok: false, error: errorMessage(error) };
    }
  }

  return {
    ok: Object.values(results).every((result) => result.ok),
    results,
  };
}

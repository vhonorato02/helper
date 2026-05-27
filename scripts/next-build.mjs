import { spawnSync } from 'node:child_process';

const env = {
  ...process.env,
  NEXT_TELEMETRY_DISABLED: '1',
};

const result = spawnSync(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'build'],
  {
    cwd: process.cwd(),
    env,
    stdio: 'inherit',
  },
);

process.exit(result.status ?? 1);

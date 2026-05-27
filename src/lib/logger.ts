// Minimal structured logger. Production-ready, no deps.
// Replace with pino/Axiom/Sentry if observability requirements grow.

type Level = 'debug' | 'info' | 'warn' | 'error';
type Fields = Record<string, unknown>;

function emit(level: Level, message: string, fields?: Fields) {
  if (level === 'debug' && process.env.NODE_ENV === 'production') return;
  const payload = {
    level,
    msg: message,
    ts: new Date().toISOString(),
    ...(fields ?? {}),
  };
  const line = JSON.stringify(payload, (_key, value) =>
    value instanceof Error
      ? { name: value.name, message: value.message, stack: value.stack }
      : value,
  );
  if (level === 'error' || level === 'warn') console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (msg: string, fields?: Fields) => emit('debug', msg, fields),
  info: (msg: string, fields?: Fields) => emit('info', msg, fields),
  warn: (msg: string, fields?: Fields) => emit('warn', msg, fields),
  error: (msg: string, fields?: Fields) => emit('error', msg, fields),
};

// Minimal structured logger. Production-ready, no deps.
// Replace with pino/Axiom/Sentry if observability requirements grow.

type Level = 'debug' | 'info' | 'warn' | 'error';
type Fields = Record<string, unknown>;

const SENSITIVE_KEY_RE = /authorization|bearer|cookie|database[_-]?url|password|secret|token/i;
const MAX_LOG_STRING_LENGTH = 2000;

function redactString(value: string) {
  return value
    .replace(/(postgres(?:ql)?:\/\/)[^\s"']+/gi, '$1[REDACTED]')
    .replace(/(bearer\s+)[^\s"']+/gi, '$1[REDACTED]')
    .replace(
      /\b(DATABASE_URL|AUTH_SECRET|CRON_SECRET|GMAIL_APP_PASSWORD|BOOTSTRAP_ADMIN_PASSWORD)\s*=\s*[^\s"']+/g,
      '$1=[REDACTED]',
    );
}

function truncateString(value: string) {
  if (value.length <= MAX_LOG_STRING_LENGTH) return value;
  return `${value.slice(0, MAX_LOG_STRING_LENGTH)}...[truncated]`;
}

function sanitizeLogValue(
  value: unknown,
  key = '',
  depth = 0,
  seen = new WeakSet<object>(),
): unknown {
  if (SENSITIVE_KEY_RE.test(key)) return '[REDACTED]';
  if (typeof value === 'string') return truncateString(redactString(value));
  if (value instanceof Error) {
    return {
      name: value.name,
      message: truncateString(redactString(value.message)),
      stack: value.stack ? truncateString(redactString(value.stack)) : undefined,
    };
  }
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return '[Circular]';
  if (depth >= 4) return '[MaxDepth]';
  seen.add(value);
  if (Array.isArray(value)) {
    return value.slice(0, 25).map((item) => sanitizeLogValue(item, key, depth + 1, seen));
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([childKey, childValue]) => [
      childKey,
      sanitizeLogValue(childValue, childKey, depth + 1, seen),
    ]),
  );
}

function sanitizeFields(fields?: Fields) {
  if (!fields) return undefined;
  return sanitizeLogValue(fields) as Fields;
}

function emit(level: Level, message: string, fields?: Fields) {
  if (level === 'debug' && process.env.NODE_ENV === 'production') return;
  const payload = {
    level,
    msg: message,
    ts: new Date().toISOString(),
    ...(sanitizeFields(fields) ?? {}),
  };
  const line = JSON.stringify(payload);
  if (level === 'error' || level === 'warn') console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (msg: string, fields?: Fields) => emit('debug', msg, fields),
  info: (msg: string, fields?: Fields) => emit('info', msg, fields),
  warn: (msg: string, fields?: Fields) => emit('warn', msg, fields),
  error: (msg: string, fields?: Fields) => emit('error', msg, fields),
};

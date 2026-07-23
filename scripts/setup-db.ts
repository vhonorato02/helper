import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { neon } from '@neondatabase/serverless';

export function getDatabaseUrl() {
  // DDL must prefer the direct connection. The pooled URL remains a fallback
  // for installations that expose only one Neon connection string.
  const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL or DATABASE_URL_UNPOOLED must be configured.');
  }
  const parsed = new URL(databaseUrl);
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('Database URL must use the postgres:// or postgresql:// protocol.');
  }
  return databaseUrl;
}

export function splitSqlStatements(sql: string) {
  const statements: string[] = [];
  let current = '';
  let quote: "'" | '"' | null = null;
  let dollarTag: string | null = null;
  let lineComment = false;
  let blockCommentDepth = 0;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];

    if (blockCommentDepth > 0) {
      current += char;
      if (char === '/' && next === '*') {
        current += next;
        index += 1;
        blockCommentDepth += 1;
        continue;
      }
      if (char === '*' && next === '/') {
        current += next;
        index += 1;
        blockCommentDepth -= 1;
      }
      continue;
    }

    if (lineComment) {
      current += char;
      if (char === '\n') lineComment = false;
      continue;
    }

    if (!quote && !dollarTag && char === '/' && next === '*') {
      blockCommentDepth = 1;
      current += char;
      continue;
    }

    if (!quote && !dollarTag && char === '-' && next === '-') {
      lineComment = true;
      current += char;
      continue;
    }

    if (!quote && char === '$') {
      const match = sql.slice(index).match(/^\$[A-Za-z0-9_]*\$/);
      if (match && (!dollarTag || dollarTag === match[0])) {
        const tag = match[0];
        current += tag;
        index += tag.length - 1;
        dollarTag = dollarTag === tag ? null : tag;
        continue;
      }
    }

    if (!dollarTag && (char === "'" || char === '"')) {
      current += char;
      if (quote === char && next === char) {
        current += next;
        index += 1;
        continue;
      }
      quote = quote === char ? null : quote ? quote : char;
      continue;
    }

    if (!quote && !dollarTag && char === ';') {
      const statement = current.trim();
      if (statement) statements.push(statement);
      current = '';
      continue;
    }

    current += char;
  }

  if (quote) throw new Error(`Unterminated ${quote} quote in SQL.`);
  if (dollarTag) throw new Error(`Unterminated ${dollarTag} block in SQL.`);
  if (blockCommentDepth > 0) throw new Error('Unterminated block comment in SQL.');

  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

function isTypePreflightStatement(statement: string) {
  return (
    /^CREATE EXTENSION\b/i.test(statement) ||
    /\bCREATE TYPE\b/i.test(statement) ||
    /^ALTER TYPE\b/i.test(statement)
  );
}

export async function setupDatabase() {
  const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
  const schema = await readFile(schemaPath, 'utf8');
  const statements = splitSqlStatements(schema);
  if (statements.length === 0) throw new Error('database/schema.sql is empty.');

  const sql = neon(getDatabaseUrl());
  const checksum = createHash('sha256').update(schema).digest('hex');
  const preflightStatements = statements.filter(isTypePreflightStatement);
  const transactionalStatements = statements.filter(
    (statement) => !isTypePreflightStatement(statement),
  );

  // PostgreSQL enum values added in a transaction cannot be used until that
  // transaction commits. Apply only extension/type reconciliation first; all
  // tables, data repairs and the history marker remain atomic below.
  for (const statement of preflightStatements) {
    await sql.query(statement);
  }

  await sql.transaction(
    (transaction) => [
      transaction.query("SET LOCAL lock_timeout = '15s'"),
      transaction.query("SELECT pg_advisory_xact_lock(4674310253294851)"),
      ...transactionalStatements.map((statement) => transaction.query(statement)),
      transaction.query(`
        CREATE TABLE IF NOT EXISTS _helper_schema_history (
          checksum text PRIMARY KEY,
          applied_at timestamp NOT NULL DEFAULT now()
        )
      `),
      transaction.query(
        `INSERT INTO _helper_schema_history (checksum)
         VALUES ($1)
         ON CONFLICT (checksum) DO NOTHING`,
        [checksum],
      ),
    ],
    { isolationLevel: 'Serializable' },
  );

  console.log(
    `Database schema applied atomically (${statements.length} statements, sha256:${checksum.slice(0, 12)}).`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  setupDatabase().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

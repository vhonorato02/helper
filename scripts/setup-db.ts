import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { neon } from '@neondatabase/serverless';

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL or DATABASE_URL_UNPOOLED must be configured.');
  }
  return databaseUrl;
}

export function splitSqlStatements(sql: string) {
  const statements: string[] = [];
  let current = '';
  let quote: "'" | '"' | null = null;
  let dollarTag: string | null = null;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];

    if (blockComment) {
      current += char;
      if (char === '*' && next === '/') {
        current += next;
        index += 1;
        blockComment = false;
      }
      continue;
    }

    if (lineComment) {
      current += char;
      if (char === '\n') lineComment = false;
      continue;
    }

    if (!quote && !dollarTag && char === '/' && next === '*') {
      blockComment = true;
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
      if (match) {
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

  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

async function setup() {
  const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
  const schema = await readFile(schemaPath, 'utf8');
  const statements = splitSqlStatements(schema);
  const sql = neon(getDatabaseUrl());

  for (const statement of statements) {
    await sql.query(statement);
  }

  console.log(`Database schema applied (${statements.length} statements).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  setup().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

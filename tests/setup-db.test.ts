import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { splitSqlStatements } from '../scripts/setup-db';

describe('setup-db SQL splitter', () => {
  it('keeps semicolons inside string literals and dollar-quoted blocks', () => {
    const statements = splitSqlStatements(`
      INSERT INTO logs (message) VALUES ('created; queued');
      DO $$
      BEGIN
        RAISE NOTICE 'inside; block';
      END
      $$;
    `);

    assert.equal(statements.length, 2);
    assert.match(statements[0], /created; queued/);
    assert.match(statements[1], /inside; block/);
  });

  it('ignores semicolons inside line and block comments', () => {
    const statements = splitSqlStatements(`
      -- comment with ; should not split
      CREATE TABLE example (id text);
      /* block comment with ; should not split */
      ALTER TABLE example ADD COLUMN name text;
    `);

    assert.deepEqual(statements, [
      '-- comment with ; should not split\n      CREATE TABLE example (id text)',
      '/* block comment with ; should not split */\n      ALTER TABLE example ADD COLUMN name text',
    ]);
  });

  it('supports nested comments and dollar-like text inside dollar blocks', () => {
    const statements = splitSqlStatements(`
      /* outer comment; /* nested comment; */ still outer */
      DO $body$
      BEGIN
        RAISE NOTICE '$other$ is text; not a delimiter';
      END
      $body$;
      SELECT 1;
    `);

    assert.equal(statements.length, 2);
    assert.match(statements[0], /\$other\$ is text; not a delimiter/);
    assert.match(statements[1], /SELECT 1/);
  });

  it('rejects truncated SQL instead of applying a partial statement', () => {
    assert.throws(
      () => splitSqlStatements("INSERT INTO logs (message) VALUES ('unfinished);"),
      /Unterminated ' quote/,
    );
    assert.throws(
      () => splitSqlStatements("DO $body$ BEGIN RAISE NOTICE 'x'; END;"),
      /Unterminated \$body\$ block/,
    );
    assert.throws(
      () => splitSqlStatements('SELECT 1; /* unfinished'),
      /Unterminated block comment/,
    );
  });
});

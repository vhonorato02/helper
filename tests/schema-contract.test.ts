import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  compareContracts,
  getCanonicalSqlContract,
  type SchemaContract,
} from '../scripts/schema-contract';
import { splitSqlStatements } from '../scripts/setup-db';

describe('database schema contract', () => {
  it('extracts tables, ALTER columns and enum values from canonical SQL', () => {
    const actual = getCanonicalSqlContract(
      splitSqlStatements(`
        DO $$ BEGIN
          CREATE TYPE area AS ENUM ('TI', 'MKT');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
        ALTER TYPE area ADD VALUE IF NOT EXISTS 'PF';
        CREATE TABLE IF NOT EXISTS users (
          id uuid PRIMARY KEY,
          display_name text NOT NULL,
          CONSTRAINT display_name_present CHECK (length(display_name) > 0)
        );
        ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;
      `),
    );

    assert.deepEqual([...actual.tables.get('users') ?? []], [
      'id',
      'display_name',
      'avatar_url',
    ]);
    assert.deepEqual(actual.enums.get('area'), ['TI', 'MKT', 'PF']);
  });

  it('reports missing runtime objects with actionable names', () => {
    const expected: SchemaContract = {
      tables: new Map([['users', new Set(['id', 'avatar_url'])]]),
      enums: new Map([['area', ['TI', 'MKT', 'PF']]]),
    };
    const actual: SchemaContract = {
      tables: new Map([['users', new Set(['id'])]]),
      enums: new Map([['area', ['TI', 'MKT']]]),
    };

    assert.deepEqual(compareContracts(expected, actual), [
      'missing column: users.avatar_url',
      'missing enum value: area.PF',
    ]);
  });
});

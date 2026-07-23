import { neon } from '@neondatabase/serverless';
import { compareContracts, getApplicationSchemaContract, type SchemaContract } from './schema-contract';
import { getDatabaseUrl } from './setup-db';

type ColumnRow = {
  table_name: string;
  column_name: string;
};

type EnumRow = {
  enum_name: string;
  enum_value: string;
  sort_order: number;
};

async function checkDatabase() {
  const sql = neon(getDatabaseUrl());
  const [rawColumnRows, rawEnumRows] = await Promise.all([
    sql.query(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `),
    sql.query(`
      SELECT
        type.typname AS enum_name,
        enum.enumlabel AS enum_value,
        enum.enumsortorder AS sort_order
      FROM pg_type type
      JOIN pg_enum enum ON enum.enumtypid = type.oid
      JOIN pg_namespace namespace ON namespace.oid = type.typnamespace
      WHERE namespace.nspname = 'public'
      ORDER BY type.typname, enum.enumsortorder
    `),
  ]);
  const columnRows = rawColumnRows as ColumnRow[];
  const enumRows = rawEnumRows as EnumRow[];

  const actual: SchemaContract = { tables: new Map(), enums: new Map() };
  for (const row of columnRows) {
    const columns = actual.tables.get(row.table_name) ?? new Set<string>();
    columns.add(row.column_name);
    actual.tables.set(row.table_name, columns);
  }
  for (const row of enumRows) {
    const values = actual.enums.get(row.enum_name) ?? [];
    values.push(row.enum_value);
    actual.enums.set(row.enum_name, values);
  }

  const expected = getApplicationSchemaContract();
  const errors = compareContracts(expected, actual);
  if (errors.length > 0) {
    throw new Error(
      `Database schema is incompatible with this release:\n- ${errors.join('\n- ')}\nRun pnpm db:setup against the intended database, then check again.`,
    );
  }

  console.log(
    `Database schema compatible (${expected.tables.size} tables and ${expected.enums.size} enums checked).`,
  );
}

checkDatabase().catch((error) => {
  console.error(error);
  process.exit(1);
});

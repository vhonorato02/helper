import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import {
  compareContracts,
  getApplicationSchemaContract,
  getCanonicalSqlContract,
} from './schema-contract';
import { splitSqlStatements } from './setup-db';

async function validateSchema() {
  const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
  const migrationsPath = path.join(process.cwd(), 'database', 'migrations');
  const schema = await readFile(schemaPath, 'utf8');
  const statements = splitSqlStatements(schema);

  const expected = getApplicationSchemaContract();
  const canonical = getCanonicalSqlContract(statements);
  const errors = compareContracts(expected, canonical);

  const migrationFiles = (await readdir(migrationsPath))
    .filter((file) => file.endsWith('.sql'))
    .sort((left, right) => left.localeCompare(right));

  for (const file of migrationFiles) {
    if (!/^\d{8}_[a-z0-9_]+\.sql$/.test(file)) {
      errors.push(`invalid migration filename: ${file}`);
    }

    const migration = await readFile(path.join(migrationsPath, file), 'utf8');
    try {
      if (splitSqlStatements(migration).length === 0) {
        errors.push(`empty migration: ${file}`);
      }
    } catch (error) {
      errors.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Schema contract validation failed:\n- ${errors.join('\n- ')}`);
  }

  console.log(
    `Schema contract valid (${expected.tables.size} tables, ${expected.enums.size} enums, ${migrationFiles.length} migrations).`,
  );
}

validateSchema().catch((error) => {
  console.error(error);
  process.exit(1);
});

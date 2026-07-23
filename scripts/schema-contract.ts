import { getTableColumns, getTableName } from 'drizzle-orm';
import * as applicationSchema from '../src/db/schema';

export type SchemaContract = {
  tables: Map<string, Set<string>>;
  enums: Map<string, string[]>;
};

export function getApplicationSchemaContract(): SchemaContract {
  const tables = new Map<string, Set<string>>();
  const enums = new Map<string, string[]>();

  for (const value of Object.values(applicationSchema)) {
    if (typeof value === 'function' && 'enumName' in value && 'enumValues' in value) {
      const enumValue = value as typeof value & {
        enumName: string;
        enumValues: string[];
      };
      enums.set(enumValue.enumName, [...enumValue.enumValues]);
      continue;
    }

    try {
      const tableName = getTableName(value as never);
      const columns = getTableColumns(value as never);
      tables.set(
        tableName,
        new Set(
          Object.values(columns).map(
            (column) => (column as { name: string }).name,
          ),
        ),
      );
    } catch {
      // Relations and inferred TypeScript values are not database objects.
    }
  }

  return { tables, enums };
}

function splitTopLevel(input: string, separator: string) {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  let quote: "'" | '"' | null = null;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (quote) {
      current += char;
      if (char === quote && next === quote) {
        current += next;
        index += 1;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      current += char;
    } else if (char === '(') {
      depth += 1;
      current += char;
    } else if (char === ')') {
      depth -= 1;
      current += char;
    } else if (char === separator && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

export function getCanonicalSqlContract(statements: string[]): SchemaContract {
  const tables = new Map<string, Set<string>>();
  const enums = new Map<string, string[]>();

  for (const statement of statements) {
    const createTable = statement.match(
      /^CREATE TABLE IF NOT EXISTS\s+"?([a-zA-Z_][\w]*)"?\s*\(([\s\S]*)\)$/i,
    );
    if (createTable) {
      const [, tableName, body] = createTable;
      const columns = tables.get(tableName) ?? new Set<string>();
      for (const definition of splitTopLevel(body, ',')) {
        if (/^(CONSTRAINT|PRIMARY|UNIQUE|CHECK|FOREIGN|EXCLUDE)\b/i.test(definition)) {
          continue;
        }
        const column = definition.match(/^"?([a-zA-Z_][\w]*)"?\s+/)?.[1];
        if (column) columns.add(column);
      }
      tables.set(tableName, columns);
      continue;
    }

    const alterColumn = statement.match(
      /^ALTER TABLE\s+"?([a-zA-Z_][\w]*)"?\s+ADD COLUMN IF NOT EXISTS\s+"?([a-zA-Z_][\w]*)"?\b/i,
    );
    if (alterColumn) {
      const [, tableName, columnName] = alterColumn;
      const columns = tables.get(tableName) ?? new Set<string>();
      columns.add(columnName);
      tables.set(tableName, columns);
    }

    const createEnum = statement.match(
      /\bCREATE TYPE\s+"?([a-zA-Z_][\w]*)"?\s+AS ENUM\s*\(([\s\S]*?)\)/i,
    );
    if (createEnum) {
      const [, enumName, values] = createEnum;
      enums.set(
        enumName,
        splitTopLevel(values, ',').map((value) =>
          value.trim().replace(/^'/, '').replace(/'$/, '').replace(/''/g, "'"),
        ),
      );
    }

    const addEnumValue = statement.match(
      /^ALTER TYPE\s+"?([a-zA-Z_][\w]*)"?\s+ADD VALUE IF NOT EXISTS\s+'([^']+)'/i,
    );
    if (addEnumValue) {
      const [, enumName, enumValue] = addEnumValue;
      const values = enums.get(enumName) ?? [];
      if (!values.includes(enumValue)) values.push(enumValue);
      enums.set(enumName, values);
    }
  }

  return { tables, enums };
}

export function compareContracts(expected: SchemaContract, actual: SchemaContract) {
  const errors: string[] = [];

  for (const [tableName, expectedColumns] of expected.tables) {
    const actualColumns = actual.tables.get(tableName);
    if (!actualColumns) {
      errors.push(`missing table: ${tableName}`);
      continue;
    }
    for (const columnName of expectedColumns) {
      if (!actualColumns.has(columnName)) {
        errors.push(`missing column: ${tableName}.${columnName}`);
      }
    }
  }

  for (const [enumName, expectedValues] of expected.enums) {
    const actualValues = actual.enums.get(enumName);
    if (!actualValues) {
      errors.push(`missing enum: ${enumName}`);
      continue;
    }
    for (const enumValue of expectedValues) {
      if (!actualValues.includes(enumValue)) {
        errors.push(`missing enum value: ${enumName}.${enumValue}`);
      }
    }
  }

  return errors;
}

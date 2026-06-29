import { db } from '@/db';
import { sql } from 'drizzle-orm';

let quickResponsesSchemaPromise: Promise<void> | null = null;

export async function ensureQuickResponsesSchema() {
  quickResponsesSchemaPromise ??= (async () => {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS quick_responses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        area area,
        title text NOT NULL,
        body text NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        usage_count integer NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
        created_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS quick_responses_area_active_idx
      ON quick_responses (area, is_active, title)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS quick_responses_usage_idx
      ON quick_responses (usage_count)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS quick_responses_creator_idx
      ON quick_responses (created_by_id)
    `);
  })();
  return quickResponsesSchemaPromise;
}

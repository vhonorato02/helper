CREATE TABLE IF NOT EXISTS marketing_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  caption text,
  channels jsonb NOT NULL DEFAULT '[]'::jsonb,
  asset_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  scheduled_for timestamp,
  ticket_id uuid REFERENCES tickets(id) ON DELETE SET NULL,
  recording_id uuid REFERENCES recordings(id) ON DELETE SET NULL,
  created_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  postiz_id text,
  published_urls jsonb NOT NULL DEFAULT '{}'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  failure_reason text,
  approved_at timestamp,
  published_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS marketing_publications_status_idx
  ON marketing_publications (status, scheduled_for);
CREATE INDEX IF NOT EXISTS marketing_publications_ticket_idx
  ON marketing_publications (ticket_id);
CREATE INDEX IF NOT EXISTS marketing_publications_recording_idx
  ON marketing_publications (recording_id);
CREATE UNIQUE INDEX IF NOT EXISTS marketing_publications_postiz_idx
  ON marketing_publications (postiz_id) WHERE postiz_id IS NOT NULL;

-- Rollback (somente antes de uso em produção):
-- DROP TABLE IF EXISTS marketing_publications;

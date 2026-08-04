CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS external_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  resource_type text NOT NULL,
  local_id text NOT NULL,
  external_id text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS external_links_local_idx
  ON external_links (provider, resource_type, local_id);
CREATE UNIQUE INDEX IF NOT EXISTS external_links_external_idx
  ON external_links (provider, resource_type, external_id);
CREATE INDEX IF NOT EXISTS external_links_provider_idx
  ON external_links (provider, resource_type);

CREATE TABLE IF NOT EXISTS integration_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  direction text NOT NULL,
  event_type text NOT NULL,
  delivery_id text,
  entity_type text,
  entity_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  available_at timestamp NOT NULL DEFAULT now(),
  processed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS integration_events_delivery_idx
  ON integration_events (provider, delivery_id)
  WHERE delivery_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS integration_events_queue_idx
  ON integration_events (status, available_at, created_at);
CREATE INDEX IF NOT EXISTS integration_events_entity_idx
  ON integration_events (provider, entity_type, entity_id);

-- Rollback (somente se nenhuma integração estiver ativa):
-- DROP TABLE IF EXISTS integration_events;
-- DROP TABLE IF EXISTS external_links;

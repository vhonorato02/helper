CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint text UNIQUE NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  expiration_time timestamp,
  user_agent text,
  created_at timestamp NOT NULL DEFAULT now(),
  last_seen_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
  ON push_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_last_seen_idx
  ON push_subscriptions (last_seen_at);

-- Rollback seguro enquanto Web Push não for canal crítico:
-- DROP TABLE IF EXISTS push_subscriptions;

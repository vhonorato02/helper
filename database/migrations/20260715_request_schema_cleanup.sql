CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
);

CREATE INDEX IF NOT EXISTS quick_responses_area_active_idx
  ON quick_responses (area, is_active, title);
CREATE INDEX IF NOT EXISTS quick_responses_usage_idx
  ON quick_responses (usage_count);
CREATE INDEX IF NOT EXISTS quick_responses_creator_idx
  ON quick_responses (created_by_id);

CREATE TABLE IF NOT EXISTS ticket_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  title text NOT NULL,
  is_done boolean NOT NULL DEFAULT false,
  author_id uuid REFERENCES users(id) ON DELETE SET NULL,
  completed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ticket_tasks_ticket_idx
  ON ticket_tasks (ticket_id, is_done, created_at);
CREATE INDEX IF NOT EXISTS ticket_tasks_author_idx
  ON ticket_tasks (author_id);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE,
  read_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON notifications (user_id, read_at);
CREATE INDEX IF NOT EXISTS notifications_created_idx
  ON notifications (created_at);

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  ticket_created boolean NOT NULL DEFAULT true,
  ticket_status boolean NOT NULL DEFAULT true,
  comment_mention boolean NOT NULL DEFAULT true,
  daily_digest boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT true,
  browser_enabled boolean NOT NULL DEFAULT true,
  reminder_lead_minutes integer NOT NULL DEFAULT 30,
  updated_at timestamp NOT NULL DEFAULT now()
);

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS browser_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS reminder_lead_minutes integer NOT NULL DEFAULT 30;

ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS reminder_minutes_before integer NOT NULL DEFAULT 30;
ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS repeat_reminder boolean NOT NULL DEFAULT true;

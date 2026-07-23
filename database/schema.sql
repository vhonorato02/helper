CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE area AS ENUM ('TI', 'MKT', 'PF');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE area ADD VALUE IF NOT EXISTS 'PF';

DO $$ BEGIN
  CREATE TYPE schedule_status AS ENUM ('pendente', 'concluido', 'cancelado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE chromebook_booking_status AS ENUM ('pendente', 'confirmado', 'cancelado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE recording_status AS ENUM ('planejada', 'confirmada', 'gravada', 'publicada', 'cancelada');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE marketing_event_category AS ENUM ('comemorativa', 'civica', 'religiosa', 'escolar', 'campanha');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE priority AS ENUM ('baixa', 'media', 'alta', 'urgente');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE status AS ENUM ('aberto', 'em_andamento', 'aguardando', 'resolvido', 'arquivado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE auth_event_type AS ENUM (
    'login_success',
    'login_failure',
    'login_rate_limited',
    'password_changed',
    'admin_reset_password'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  must_change_password boolean NOT NULL DEFAULT false,
  password_changed_at timestamp,
  last_login_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS area area;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;
CREATE INDEX IF NOT EXISTS users_area_role_idx ON users (area, role) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS user_areas (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  area area NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, area)
);

CREATE INDEX IF NOT EXISTS user_areas_area_idx
  ON user_areas (area);

INSERT INTO user_areas (user_id, area)
SELECT id, area
FROM users
WHERE area IS NOT NULL
ON CONFLICT (user_id, area) DO NOTHING;

DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_role_area_consistency_chk CHECK (
    role IS NULL
    OR role NOT IN ('ti', 'marketing', 'por_fora')
    OR area IS NULL
    OR (role = 'ti' AND area = 'TI')
    OR (role = 'marketing' AND area = 'MKT')
    OR (role = 'por_fora' AND area = 'PF')
  ) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS area_primary_assignees (
  area area PRIMARY KEY,
  primary_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS area_primary_assignees_user_idx
  ON area_primary_assignees (primary_user_id);

INSERT INTO area_primary_assignees (area, primary_user_id)
SELECT area, (array_agg(id))[1]
FROM users
WHERE
  is_active = true
  AND (
    (area = 'TI' AND role = 'ti')
    OR (area = 'MKT' AND role = 'marketing')
    OR (area = 'PF' AND role = 'por_fora')
  )
GROUP BY area
HAVING count(*) = 1
ON CONFLICT (area) DO NOTHING;

CREATE TABLE IF NOT EXISTS subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area area NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS subcategories_area_label_idx ON subcategories (area, label);
CREATE INDEX IF NOT EXISTS subcategories_active_idx ON subcategories (area, is_active, sort_order);

CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  area area NOT NULL,
  title text NOT NULL,
  description text,
  subcategory text NOT NULL,
  origin text,
  public_contact text,
  location text,
  priority priority NOT NULL DEFAULT 'media',
  status status NOT NULL DEFAULT 'aberto',
  assignee_id uuid REFERENCES users(id) ON DELETE SET NULL,
  author_id uuid REFERENCES users(id) ON DELETE SET NULL,
  due_date timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  resolved_at timestamp
);

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS due_date timestamp;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolved_at timestamp;

CREATE INDEX IF NOT EXISTS tickets_area_idx ON tickets (area);
CREATE INDEX IF NOT EXISTS tickets_status_idx ON tickets (status);
CREATE INDEX IF NOT EXISTS tickets_priority_idx ON tickets (priority);
CREATE INDEX IF NOT EXISTS tickets_assignee_idx ON tickets (assignee_id);
CREATE INDEX IF NOT EXISTS tickets_created_idx ON tickets (created_at);
CREATE INDEX IF NOT EXISTS tickets_due_idx ON tickets (due_date);

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS public_contact text;

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id uuid REFERENCES users(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS ticket_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id uuid REFERENCES users(id) ON DELETE SET NULL,
  field text NOT NULL,
  old_value text,
  new_value text,
  created_at timestamp NOT NULL DEFAULT now()
);

WITH invalid_assignments AS (
  SELECT
    t.id AS ticket_id,
    COALESCE(u.display_name, t.assignee_id::text) AS assignee_name
  FROM tickets t
  LEFT JOIN users u ON u.id = t.assignee_id
  WHERE
    t.assignee_id IS NOT NULL
    AND t.status IN ('aberto', 'em_andamento', 'aguardando')
    AND NOT EXISTS (
      SELECT 1
      FROM users candidate
      WHERE
        candidate.id = t.assignee_id
        AND candidate.is_active = true
        AND EXISTS (
          SELECT 1
          FROM (
            SELECT ua.area
            FROM user_areas ua
            WHERE ua.user_id = candidate.id
            UNION
            SELECT candidate.area
            WHERE candidate.area IS NOT NULL
          ) enabled_areas
          WHERE enabled_areas.area = t.area
        )
        AND (
          candidate.role IS NULL
          OR candidate.role NOT IN ('ti', 'marketing', 'por_fora')
          OR EXISTS (
            SELECT 1
            FROM (
              SELECT ua.area
              FROM user_areas ua
              WHERE ua.user_id = candidate.id
              UNION
              SELECT candidate.area
              WHERE candidate.area IS NOT NULL
            ) role_areas
            WHERE
              (candidate.role = 'ti' AND role_areas.area = 'TI')
              OR (candidate.role = 'marketing' AND role_areas.area = 'MKT')
              OR (candidate.role = 'por_fora' AND role_areas.area = 'PF')
          )
        )
    )
),
history_rows AS (
  INSERT INTO ticket_history (ticket_id, author_id, field, old_value, new_value)
  SELECT ticket_id, NULL, 'responsavel', assignee_name, NULL
  FROM invalid_assignments
  RETURNING ticket_id
)
UPDATE tickets
SET assignee_id = NULL, updated_at = now()
WHERE id IN (SELECT ticket_id FROM invalid_assignments);

UPDATE area_primary_assignees apa
SET primary_user_id = NULL, updated_at = now()
WHERE
  apa.primary_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM users candidate
    WHERE
      candidate.id = apa.primary_user_id
      AND candidate.is_active = true
      AND EXISTS (
        SELECT 1
        FROM (
          SELECT ua.area
          FROM user_areas ua
          WHERE ua.user_id = candidate.id
          UNION
          SELECT candidate.area
          WHERE candidate.area IS NOT NULL
        ) enabled_areas
        WHERE enabled_areas.area = apa.area
      )
      AND (
        candidate.role IS NULL
        OR candidate.role NOT IN ('ti', 'marketing', 'por_fora')
        OR EXISTS (
          SELECT 1
          FROM (
            SELECT ua.area
            FROM user_areas ua
            WHERE ua.user_id = candidate.id
            UNION
            SELECT candidate.area
            WHERE candidate.area IS NOT NULL
          ) role_areas
          WHERE
            (candidate.role = 'ti' AND role_areas.area = 'TI')
            OR (candidate.role = 'marketing' AND role_areas.area = 'MKT')
            OR (candidate.role = 'por_fora' AND role_areas.area = 'PF')
        )
      )
  );

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

CREATE INDEX IF NOT EXISTS ticket_tasks_ticket_idx ON ticket_tasks (ticket_id, is_done, created_at);
CREATE INDEX IF NOT EXISTS ticket_tasks_author_idx ON ticket_tasks (author_id);

CREATE TABLE IF NOT EXISTS ticket_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamp NOT NULL DEFAULT now(),
  seen_at timestamp
);

CREATE INDEX IF NOT EXISTS mentions_user_idx ON ticket_mentions (user_id, seen_at);
CREATE INDEX IF NOT EXISTS mentions_ticket_idx ON ticket_mentions (ticket_id);

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

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON notifications (user_id, read_at);
CREATE INDEX IF NOT EXISTS notifications_created_idx ON notifications (created_at);

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

ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS browser_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS reminder_lead_minutes integer NOT NULL DEFAULT 30;

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

CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  scheduled_date timestamp NOT NULL,
  area area,
  status schedule_status NOT NULL DEFAULT 'pendente',
  reminder_minutes_before integer NOT NULL DEFAULT 30,
  repeat_reminder boolean NOT NULL DEFAULT true,
  author_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

ALTER TABLE schedules ADD COLUMN IF NOT EXISTS reminder_minutes_before integer NOT NULL DEFAULT 30;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS repeat_reminder boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS schedules_date_idx ON schedules (scheduled_date);
CREATE INDEX IF NOT EXISTS schedules_status_idx ON schedules (status);
CREATE INDEX IF NOT EXISTS schedules_area_idx ON schedules (area);

CREATE TABLE IF NOT EXISTS chromebook_settings (
  id text PRIMARY KEY DEFAULT 'default',
  total_chromebooks integer NOT NULL DEFAULT 30 CHECK (total_chromebooks > 0),
  updated_at timestamp NOT NULL DEFAULT now()
);

INSERT INTO chromebook_settings (id, total_chromebooks)
VALUES ('default', 30)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS chromebook_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_at timestamp NOT NULL,
  end_at timestamp NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  room text NOT NULL,
  requester_name text NOT NULL,
  requester_contact text,
  protocol text,
  notes text,
  status chromebook_booking_status NOT NULL DEFAULT 'pendente',
  responsible_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT chromebook_booking_time_order CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS chromebook_bookings_start_idx ON chromebook_bookings (start_at);
CREATE INDEX IF NOT EXISTS chromebook_bookings_end_idx ON chromebook_bookings (end_at);
CREATE INDEX IF NOT EXISTS chromebook_bookings_status_idx ON chromebook_bookings (status);
CREATE INDEX IF NOT EXISTS chromebook_bookings_room_idx ON chromebook_bookings (room);
CREATE INDEX IF NOT EXISTS chromebook_bookings_responsible_idx ON chromebook_bookings (responsible_id);

ALTER TABLE chromebook_bookings ADD COLUMN IF NOT EXISTS requester_contact text;
ALTER TABLE chromebook_bookings ADD COLUMN IF NOT EXISTS protocol text;
CREATE UNIQUE INDEX IF NOT EXISTS chromebook_bookings_protocol_idx ON chromebook_bookings (protocol) WHERE protocol IS NOT NULL;

CREATE TABLE IF NOT EXISTS chromebook_booking_locks (
  id text PRIMARY KEY,
  owner text NOT NULL,
  expires_at timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  pauta text,
  scheduled_date timestamp NOT NULL,
  duration_minutes integer,
  location text,
  participants text,
  equipment text,
  publish_channel text,
  status recording_status NOT NULL DEFAULT 'planejada',
  responsible_id uuid REFERENCES users(id) ON DELETE SET NULL,
  author_id uuid REFERENCES users(id) ON DELETE SET NULL,
  ticket_id uuid REFERENCES tickets(id) ON DELETE SET NULL,
  notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recordings_date_idx ON recordings (scheduled_date);
CREATE INDEX IF NOT EXISTS recordings_status_idx ON recordings (status);
CREATE INDEX IF NOT EXISTS recordings_responsible_idx ON recordings (responsible_id);

CREATE TABLE IF NOT EXISTS marketing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  month integer NOT NULL,
  day integer NOT NULL,
  category marketing_event_category NOT NULL DEFAULT 'comemorativa',
  lead_days integer NOT NULL DEFAULT 7,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS marketing_events_name_idx ON marketing_events (name, month, day);
CREATE INDEX IF NOT EXISTS marketing_events_calendar_idx ON marketing_events (month, day, is_active);

CREATE TABLE IF NOT EXISTS auth_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  username text,
  type auth_event_type NOT NULL,
  ip text,
  user_agent text,
  detail text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_events_user_idx ON auth_events (user_id, created_at);
CREATE INDEX IF NOT EXISTS auth_events_type_idx ON auth_events (type, created_at);

INSERT INTO marketing_events (name, description, month, day, category, lead_days, sort_order) VALUES
  ('Confraternização Universal', 'Início do ano letivo se aproxima — comunicação de volta às aulas.', 1, 1, 'civica', 14, 10),
  ('Dia Internacional da Mulher', 'Homenagem a mulheres da comunidade escolar.', 3, 8, 'comemorativa', 10, 20),
  ('Dia Mundial da Água', 'Atividade ambiental e conscientização.', 3, 22, 'escolar', 10, 30),
  ('Tiradentes', 'Feriado nacional — recesso e comunicados.', 4, 21, 'civica', 7, 40),
  ('Dia do Livro', 'Feira do livro, indicações de leitura, biblioteca.', 4, 23, 'escolar', 14, 50),
  ('Dia do Trabalho', 'Feriado — comunicado de funcionamento.', 5, 1, 'civica', 7, 60),
  ('Dia das Mães', 'Homenagem e evento — confirmar data do 2º domingo de maio.', 5, 11, 'comemorativa', 21, 70),
  ('Dia Mundial do Meio Ambiente', 'Projeto sustentabilidade e comunicação.', 6, 5, 'escolar', 14, 80),
  ('Festa Junina', 'Maior evento do calendário — divulgação, convites, vídeos.', 6, 24, 'escolar', 45, 90),
  ('Férias de julho', 'Comunicado de calendário e atividades de recesso.', 7, 1, 'escolar', 14, 100),
  ('Dia dos Pais', 'Homenagem — confirmar 2º domingo de agosto.', 8, 10, 'comemorativa', 21, 110),
  ('Dia do Estudante', 'Homenagem aos alunos.', 8, 11, 'escolar', 7, 120),
  ('Dia do Folclore', 'Atividades culturais com Educação Infantil e Fundamental I.', 8, 22, 'escolar', 10, 130),
  ('Dia da Independência', 'Feriado e desfile cívico.', 9, 7, 'civica', 14, 140),
  ('Dia da Árvore', 'Plantio, atividades de educação ambiental, posts.', 9, 21, 'escolar', 14, 150),
  ('Início da Primavera', 'Decoração, fotos e campanhas sazonais.', 9, 22, 'comemorativa', 7, 160),
  ('Dia das Crianças', 'Evento e divulgação — datas variam por segmento.', 10, 12, 'comemorativa', 21, 170),
  ('Dia do Professor', 'Homenagem aos professores.', 10, 15, 'escolar', 14, 180),
  ('Finados', 'Feriado — comunicado de funcionamento.', 11, 2, 'civica', 7, 190),
  ('Proclamação da República', 'Feriado e atividade cívica.', 11, 15, 'civica', 7, 200),
  ('Dia da Consciência Negra', 'Atividades pedagógicas e culturais.', 11, 20, 'escolar', 14, 210),
  ('Black Friday', 'Campanha de matrículas/rematrículas.', 11, 28, 'campanha', 30, 220),
  ('Natal', 'Cantata, encerramento, decoração e comunicações.', 12, 25, 'religiosa', 30, 230),
  ('Réveillon', 'Encerramento do ano letivo e boas-festas.', 12, 31, 'comemorativa', 14, 240),
  ('Matrículas abertas', 'Campanha anual de captação — confirmar data com a direção.', 8, 1, 'campanha', 60, 80),
  ('Rematrícula', 'Campanha anual de rematrícula.', 10, 1, 'campanha', 45, 165)
ON CONFLICT (name, month, day) DO NOTHING;

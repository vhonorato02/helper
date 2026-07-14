ALTER TABLE users ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS area area;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;

CREATE INDEX IF NOT EXISTS users_area_role_idx
  ON users (area, role) WHERE is_active = true;

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

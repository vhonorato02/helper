CREATE TABLE IF NOT EXISTS area_primary_assignees (
  area area PRIMARY KEY,
  primary_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS area_primary_assignees_user_idx
  ON area_primary_assignees (primary_user_id);

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

-- Safe bootstrap only when an area has exactly one active user already tagged for it.
-- Ambiguous areas remain unconfigured so admins must choose explicitly.
INSERT INTO area_primary_assignees (area, primary_user_id)
SELECT area, max(id)
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

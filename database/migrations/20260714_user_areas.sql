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

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_area_consistency_chk;

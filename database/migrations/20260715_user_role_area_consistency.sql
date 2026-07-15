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

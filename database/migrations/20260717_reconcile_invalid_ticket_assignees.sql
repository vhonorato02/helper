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

-- =============================================================
-- We Ate — Quick Add inline entries
-- Adds per-entry nutrition columns so users can log a one-off
-- item without creating a saved recipe or quick_item.
-- =============================================================

-- 1. Add new columns (idempotent)
ALTER TABLE daily_log_entries
  ADD COLUMN IF NOT EXISTS is_quick_add  BOOLEAN        NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS qa_name       TEXT,
  ADD COLUMN IF NOT EXISTS qa_calories   NUMERIC(7, 1),
  ADD COLUMN IF NOT EXISTS qa_protein    NUMERIC(6, 1),
  ADD COLUMN IF NOT EXISTS qa_carbs      NUMERIC(6, 1),
  ADD COLUMN IF NOT EXISTS qa_fat        NUMERIC(6, 1),
  ADD COLUMN IF NOT EXISTS qa_fiber      NUMERIC(6, 1);

-- 2. Replace the source constraint to allow quick-add entries
--    (recipe_id and quick_item_id are both NULL when is_quick_add = true)
ALTER TABLE daily_log_entries
  DROP CONSTRAINT one_source_only;

ALTER TABLE daily_log_entries
  ADD CONSTRAINT one_source_only CHECK (
    (recipe_id IS NOT NULL AND quick_item_id IS NULL     AND NOT is_quick_add) OR
    (recipe_id IS NULL     AND quick_item_id IS NOT NULL AND NOT is_quick_add) OR
    (recipe_id IS NULL     AND quick_item_id IS NULL     AND is_quick_add AND qa_name IS NOT NULL)
  );

-- 3. Update snapshot_daily_history() to include quick-add entries
CREATE OR REPLACE FUNCTION snapshot_daily_history(snapshot_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
BEGIN
  INSERT INTO daily_history (date, person, total_calories, protein, carbs, fat, fiber)
  SELECT
    e.date,
    e.person,

    COALESCE(SUM(
      CASE
        WHEN e.recipe_id      IS NOT NULL THEN rn.calories              * e.quantity
        WHEN e.quick_item_id  IS NOT NULL THEN qi.calories              * e.quantity
        WHEN e.is_quick_add               THEN COALESCE(e.qa_calories, 0) * e.quantity
      END
    ), 0) AS total_calories,

    COALESCE(SUM(
      CASE
        WHEN e.recipe_id      IS NOT NULL THEN rn.protein               * e.quantity
        WHEN e.quick_item_id  IS NOT NULL THEN qi.protein               * e.quantity
        WHEN e.is_quick_add               THEN COALESCE(e.qa_protein, 0) * e.quantity
      END
    ), 0) AS protein,

    COALESCE(SUM(
      CASE
        WHEN e.recipe_id      IS NOT NULL THEN rn.carbs                 * e.quantity
        WHEN e.quick_item_id  IS NOT NULL THEN qi.carbs                 * e.quantity
        WHEN e.is_quick_add               THEN COALESCE(e.qa_carbs, 0)  * e.quantity
      END
    ), 0) AS carbs,

    COALESCE(SUM(
      CASE
        WHEN e.recipe_id      IS NOT NULL THEN rn.fat                   * e.quantity
        WHEN e.quick_item_id  IS NOT NULL THEN qi.fat                   * e.quantity
        WHEN e.is_quick_add               THEN COALESCE(e.qa_fat, 0)    * e.quantity
      END
    ), 0) AS fat,

    SUM(
      CASE
        WHEN e.recipe_id      IS NOT NULL THEN rn.fiber   * e.quantity
        WHEN e.quick_item_id  IS NOT NULL THEN qi.fiber   * e.quantity
        WHEN e.is_quick_add               THEN e.qa_fiber * e.quantity
      END
    ) AS fiber

  FROM daily_log_entries e
  LEFT JOIN recipe_nutrition rn
         ON rn.recipe_id = e.recipe_id AND rn.person = e.person
  LEFT JOIN quick_items qi
         ON qi.id = e.quick_item_id
  WHERE e.date = snapshot_date
  GROUP BY e.date, e.person

  ON CONFLICT (date, person) DO UPDATE SET
    total_calories = EXCLUDED.total_calories,
    protein        = EXCLUDED.protein,
    carbs          = EXCLUDED.carbs,
    fat            = EXCLUDED.fat,
    fiber          = EXCLUDED.fiber;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

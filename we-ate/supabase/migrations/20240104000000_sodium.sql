-- =============================================================
-- We Ate — Sodium tracking
-- Adds sodium (mg) to all nutrition tables and the snapshot fn.
-- =============================================================

-- recipe nutrition (per person per recipe)
ALTER TABLE recipe_nutrition
  ADD COLUMN IF NOT EXISTS sodium NUMERIC(7, 1);

-- saved quick items
ALTER TABLE quick_items
  ADD COLUMN IF NOT EXISTS sodium NUMERIC(7, 1);

-- inline quick-add entries on the daily log
ALTER TABLE daily_log_entries
  ADD COLUMN IF NOT EXISTS qa_sodium NUMERIC(7, 1);

-- per-person daily targets  (default 2300 mg — the standard recommended limit)
ALTER TABLE user_targets
  ADD COLUMN IF NOT EXISTS sodium NUMERIC(7, 1) DEFAULT 2300;
UPDATE user_targets SET sodium = 2300 WHERE sodium IS NULL;

-- historical daily snapshots
ALTER TABLE daily_history
  ADD COLUMN IF NOT EXISTS sodium NUMERIC(7, 1);

-- Update snapshot function to include sodium
CREATE OR REPLACE FUNCTION snapshot_daily_history(snapshot_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
BEGIN
  INSERT INTO daily_history (date, person, total_calories, protein, carbs, fat, fiber, sodium)
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
    ) AS fiber,

    SUM(
      CASE
        WHEN e.recipe_id      IS NOT NULL THEN rn.sodium   * e.quantity
        WHEN e.quick_item_id  IS NOT NULL THEN qi.sodium   * e.quantity
        WHEN e.is_quick_add               THEN e.qa_sodium * e.quantity
      END
    ) AS sodium

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
    fiber          = EXCLUDED.fiber,
    sodium         = EXCLUDED.sodium;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

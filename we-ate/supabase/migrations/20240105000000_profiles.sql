-- =============================================================
-- We Ate — Profiles refactor
-- Replaces hardcoded person TEXT with dynamic profiles table.
-- Seeds Kat and Jeremiah with fixed UUIDs so existing data
-- is backfilled without loss.
-- =============================================================

-- ── 1. profiles table ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shared_account_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "shared_account_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "shared_account_update" ON profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "shared_account_delete" ON profiles FOR DELETE TO authenticated USING (true);

-- Seed the two existing users with fixed, deterministic UUIDs
INSERT INTO profiles (id, name, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Kat',      NOW() - INTERVAL '1 second'),
  ('00000000-0000-0000-0000-000000000002', 'Jeremiah', NOW())
ON CONFLICT (id) DO NOTHING;


-- ── 2. Add profile_id columns (nullable initially) ────────────

ALTER TABLE recipe_nutrition   ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id);
ALTER TABLE daily_log_entries  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id);
ALTER TABLE daily_history      ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id);
ALTER TABLE weight_log         ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id);
ALTER TABLE user_targets       ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id);


-- ── 3. Backfill profile_id from existing person values ────────

UPDATE recipe_nutrition  SET profile_id = '00000000-0000-0000-0000-000000000001' WHERE person = 'kat';
UPDATE recipe_nutrition  SET profile_id = '00000000-0000-0000-0000-000000000002' WHERE person = 'jeremiah';

UPDATE daily_log_entries SET profile_id = '00000000-0000-0000-0000-000000000001' WHERE person = 'kat';
UPDATE daily_log_entries SET profile_id = '00000000-0000-0000-0000-000000000002' WHERE person = 'jeremiah';

UPDATE daily_history     SET profile_id = '00000000-0000-0000-0000-000000000001' WHERE person = 'kat';
UPDATE daily_history     SET profile_id = '00000000-0000-0000-0000-000000000002' WHERE person = 'jeremiah';

UPDATE weight_log        SET profile_id = '00000000-0000-0000-0000-000000000001' WHERE person = 'kat';
UPDATE weight_log        SET profile_id = '00000000-0000-0000-0000-000000000002' WHERE person = 'jeremiah';

UPDATE user_targets      SET profile_id = '00000000-0000-0000-0000-000000000001' WHERE person = 'kat';
UPDATE user_targets      SET profile_id = '00000000-0000-0000-0000-000000000002' WHERE person = 'jeremiah';


-- ── 4. Make profile_id NOT NULL ───────────────────────────────

ALTER TABLE recipe_nutrition   ALTER COLUMN profile_id SET NOT NULL;
ALTER TABLE daily_log_entries  ALTER COLUMN profile_id SET NOT NULL;
ALTER TABLE daily_history      ALTER COLUMN profile_id SET NOT NULL;
ALTER TABLE weight_log         ALTER COLUMN profile_id SET NOT NULL;
ALTER TABLE user_targets       ALTER COLUMN profile_id SET NOT NULL;


-- ── 5. Drop old constraints that reference person ─────────────

-- recipe_nutrition
ALTER TABLE recipe_nutrition DROP CONSTRAINT IF EXISTS recipe_nutrition_recipe_id_person_key;
ALTER TABLE recipe_nutrition DROP CONSTRAINT IF EXISTS recipe_nutrition_person_check;

-- daily_log_entries
ALTER TABLE daily_log_entries DROP CONSTRAINT IF EXISTS daily_log_entries_person_check;

-- daily_history
ALTER TABLE daily_history DROP CONSTRAINT IF EXISTS daily_history_date_person_key;
ALTER TABLE daily_history DROP CONSTRAINT IF EXISTS daily_history_person_check;

-- weight_log
ALTER TABLE weight_log DROP CONSTRAINT IF EXISTS weight_log_date_person_key;
ALTER TABLE weight_log DROP CONSTRAINT IF EXISTS weight_log_person_check;

-- user_targets
ALTER TABLE user_targets DROP CONSTRAINT IF EXISTS user_targets_person_key;
ALTER TABLE user_targets DROP CONSTRAINT IF EXISTS user_targets_person_check;


-- ── 6. Add new constraints keyed on profile_id ────────────────

ALTER TABLE recipe_nutrition  ADD CONSTRAINT recipe_nutrition_recipe_id_profile_id_key UNIQUE (recipe_id, profile_id);
ALTER TABLE daily_history     ADD CONSTRAINT daily_history_date_profile_id_key          UNIQUE (date, profile_id);
ALTER TABLE weight_log        ADD CONSTRAINT weight_log_date_profile_id_key             UNIQUE (date, profile_id);
ALTER TABLE user_targets      ADD CONSTRAINT user_targets_profile_id_key                UNIQUE (profile_id);


-- ── 7. Drop old person columns ────────────────────────────────

ALTER TABLE recipe_nutrition   DROP COLUMN IF EXISTS person;
ALTER TABLE daily_log_entries  DROP COLUMN IF EXISTS person;
ALTER TABLE daily_history      DROP COLUMN IF EXISTS person;
ALTER TABLE weight_log         DROP COLUMN IF EXISTS person;
ALTER TABLE user_targets       DROP COLUMN IF EXISTS person;


-- ── 8. Drop and recreate indexes ──────────────────────────────

DROP INDEX IF EXISTS idx_log_entries_date_person;
DROP INDEX IF EXISTS idx_daily_history_date_person;
DROP INDEX IF EXISTS idx_weight_log_date_person;

CREATE INDEX idx_log_entries_date_profile  ON daily_log_entries (date, profile_id);
CREATE INDEX idx_daily_history_date_profile ON daily_history    (date, profile_id);
CREATE INDEX idx_weight_log_date_profile    ON weight_log       (date, profile_id);


-- ── 9. Recreate snapshot function with profile_id ─────────────

CREATE OR REPLACE FUNCTION snapshot_daily_history(snapshot_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
BEGIN
  INSERT INTO daily_history (date, profile_id, total_calories, protein, carbs, fat, fiber, sodium)
  SELECT
    e.date,
    e.profile_id,

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
         ON rn.recipe_id = e.recipe_id AND rn.profile_id = e.profile_id
  LEFT JOIN quick_items qi
         ON qi.id = e.quick_item_id
  WHERE e.date = snapshot_date
  GROUP BY e.date, e.profile_id

  ON CONFLICT (date, profile_id) DO UPDATE SET
    total_calories = EXCLUDED.total_calories,
    protein        = EXCLUDED.protein,
    carbs          = EXCLUDED.carbs,
    fat            = EXCLUDED.fat,
    fiber          = EXCLUDED.fiber,
    sodium         = EXCLUDED.sodium;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

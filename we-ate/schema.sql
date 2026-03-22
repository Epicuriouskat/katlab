-- =============================================================
-- We Ate — Full schema (clean install)
-- Run this once in a new empty Supabase project.
-- =============================================================


-- =============================================================
-- TABLES
-- =============================================================

-- Profiles — one row per person using the app (max 2)
CREATE TABLE profiles (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Recipes
-- type = 'split'  → each profile has different ingredient amounts / nutrition
-- type = 'single' → same amounts for everyone
CREATE TABLE recipes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  type       TEXT        NOT NULL CHECK (type IN ('split', 'single')),
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ingredients per recipe
-- kat_amount / jeremiah_amount are free-form text (e.g. "3 oz", "1 cup")
CREATE TABLE recipe_ingredients (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id        UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_name  TEXT NOT NULL,
  kat_amount       TEXT,
  jeremiah_amount  TEXT,
  sort_order       INT  NOT NULL DEFAULT 0
);

-- Nutrition per recipe per profile
CREATE TABLE recipe_nutrition (
  id         UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id  UUID           NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  profile_id UUID           NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  calories   NUMERIC(7, 1)  NOT NULL,
  protein    NUMERIC(6, 1)  NOT NULL DEFAULT 0,
  carbs      NUMERIC(6, 1)  NOT NULL DEFAULT 0,
  fat        NUMERIC(6, 1)  NOT NULL DEFAULT 0,
  fiber      NUMERIC(6, 1),
  sodium     NUMERIC(7, 1),
  UNIQUE (recipe_id, profile_id)
);

-- Saved quick items (snacks / simple items without a full recipe)
CREATE TABLE quick_items (
  id         UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT           NOT NULL,
  calories   NUMERIC(7, 1)  NOT NULL,
  protein    NUMERIC(6, 1)  NOT NULL DEFAULT 0,
  carbs      NUMERIC(6, 1)  NOT NULL DEFAULT 0,
  fat        NUMERIC(6, 1)  NOT NULL DEFAULT 0,
  fiber      NUMERIC(6, 1),
  sodium     NUMERIC(7, 1),
  created_at TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Daily food log
-- Each entry is one of: a recipe, a saved quick_item, or an inline quick-add
CREATE TABLE daily_log_entries (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  date           DATE           NOT NULL DEFAULT CURRENT_DATE,
  profile_id     UUID           NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  meal_slot      TEXT           NOT NULL CHECK (meal_slot IN ('breakfast', 'lunch', 'dinner', 'snacks')),
  recipe_id      UUID           REFERENCES recipes(id)     ON DELETE SET NULL,
  quick_item_id  UUID           REFERENCES quick_items(id) ON DELETE SET NULL,
  quantity       NUMERIC(5, 2)  NOT NULL DEFAULT 1,
  logged_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  -- inline quick-add fields
  is_quick_add   BOOLEAN        NOT NULL DEFAULT FALSE,
  qa_name        TEXT,
  qa_calories    NUMERIC(7, 1),
  qa_protein     NUMERIC(6, 1),
  qa_carbs       NUMERIC(6, 1),
  qa_fat         NUMERIC(6, 1),
  qa_fiber       NUMERIC(6, 1),
  qa_sodium      NUMERIC(7, 1),

  CONSTRAINT one_source_only CHECK (
    (recipe_id IS NOT NULL AND quick_item_id IS NULL     AND NOT is_quick_add) OR
    (recipe_id IS NULL     AND quick_item_id IS NOT NULL AND NOT is_quick_add) OR
    (recipe_id IS NULL     AND quick_item_id IS NULL     AND is_quick_add AND qa_name IS NOT NULL)
  )
);

-- Historical daily totals — written by snapshot_daily_history()
CREATE TABLE daily_history (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  date            DATE           NOT NULL,
  profile_id      UUID           NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  total_calories  NUMERIC(7, 1)  NOT NULL DEFAULT 0,
  protein         NUMERIC(6, 1)  NOT NULL DEFAULT 0,
  carbs           NUMERIC(6, 1)  NOT NULL DEFAULT 0,
  fat             NUMERIC(6, 1)  NOT NULL DEFAULT 0,
  fiber           NUMERIC(6, 1),
  sodium          NUMERIC(7, 1),
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE (date, profile_id)
);

-- Weight log — one entry per profile per day
CREATE TABLE weight_log (
  id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  date        DATE           NOT NULL DEFAULT CURRENT_DATE,
  profile_id  UUID           NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  weight_lbs  NUMERIC(5, 1)  NOT NULL,
  logged_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE (date, profile_id)
);

-- Per-profile nutrition targets
CREATE TABLE user_targets (
  id         UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID           NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  calories   NUMERIC(7, 1)  NOT NULL DEFAULT 2000,
  protein    NUMERIC(6, 1)  NOT NULL DEFAULT 150,
  carbs      NUMERIC(6, 1)  NOT NULL DEFAULT 200,
  fat        NUMERIC(6, 1)  NOT NULL DEFAULT 65,
  fiber      NUMERIC(6, 1),
  sodium     NUMERIC(7, 1)  DEFAULT 2300,
  updated_at TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id)
);


-- =============================================================
-- INDEXES
-- =============================================================

CREATE INDEX idx_recipe_ingredients_recipe   ON recipe_ingredients (recipe_id);
CREATE INDEX idx_recipe_nutrition_recipe     ON recipe_nutrition   (recipe_id);
CREATE INDEX idx_log_entries_date_profile    ON daily_log_entries  (date, profile_id);
CREATE INDEX idx_log_entries_recipe          ON daily_log_entries  (recipe_id)     WHERE recipe_id IS NOT NULL;
CREATE INDEX idx_log_entries_quick_item      ON daily_log_entries  (quick_item_id) WHERE quick_item_id IS NOT NULL;
CREATE INDEX idx_daily_history_date_profile  ON daily_history      (date, profile_id);
CREATE INDEX idx_weight_log_date_profile     ON weight_log         (date, profile_id);


-- =============================================================
-- FUNCTIONS
-- =============================================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER user_targets_updated_at
  BEFORE UPDATE ON user_targets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Snapshot today's totals into daily_history.
-- Call this at midnight via pg_cron or a Supabase Edge Function cron.
CREATE OR REPLACE FUNCTION snapshot_daily_history(snapshot_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
BEGIN
  INSERT INTO daily_history (date, profile_id, total_calories, protein, carbs, fat, fiber, sodium)
  SELECT
    e.date,
    e.profile_id,

    COALESCE(SUM(
      CASE
        WHEN e.recipe_id      IS NOT NULL THEN rn.calories               * e.quantity
        WHEN e.quick_item_id  IS NOT NULL THEN qi.calories               * e.quantity
        WHEN e.is_quick_add               THEN COALESCE(e.qa_calories, 0) * e.quantity
      END
    ), 0) AS total_calories,

    COALESCE(SUM(
      CASE
        WHEN e.recipe_id      IS NOT NULL THEN rn.protein                * e.quantity
        WHEN e.quick_item_id  IS NOT NULL THEN qi.protein                * e.quantity
        WHEN e.is_quick_add               THEN COALESCE(e.qa_protein, 0) * e.quantity
      END
    ), 0) AS protein,

    COALESCE(SUM(
      CASE
        WHEN e.recipe_id      IS NOT NULL THEN rn.carbs                  * e.quantity
        WHEN e.quick_item_id  IS NOT NULL THEN qi.carbs                  * e.quantity
        WHEN e.is_quick_add               THEN COALESCE(e.qa_carbs, 0)   * e.quantity
      END
    ), 0) AS carbs,

    COALESCE(SUM(
      CASE
        WHEN e.recipe_id      IS NOT NULL THEN rn.fat                    * e.quantity
        WHEN e.quick_item_id  IS NOT NULL THEN qi.fat                    * e.quantity
        WHEN e.is_quick_add               THEN COALESCE(e.qa_fat, 0)     * e.quantity
      END
    ), 0) AS fat,

    SUM(
      CASE
        WHEN e.recipe_id      IS NOT NULL THEN rn.fiber    * e.quantity
        WHEN e.quick_item_id  IS NOT NULL THEN qi.fiber    * e.quantity
        WHEN e.is_quick_add               THEN e.qa_fiber  * e.quantity
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


-- =============================================================
-- ROW LEVEL SECURITY
-- All tables require an authenticated session.
-- Profiles share one Supabase auth account, so USING (true)
-- gives every logged-in user access to all rows.
-- =============================================================

ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients  ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_nutrition    ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_log_entries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_history       ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_targets        ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "shared_account_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "shared_account_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "shared_account_update" ON profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "shared_account_delete" ON profiles FOR DELETE TO authenticated USING (true);

-- recipes
CREATE POLICY "shared_account_select" ON recipes FOR SELECT TO authenticated USING (true);
CREATE POLICY "shared_account_insert" ON recipes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "shared_account_update" ON recipes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "shared_account_delete" ON recipes FOR DELETE TO authenticated USING (true);

-- recipe_ingredients
CREATE POLICY "shared_account_select" ON recipe_ingredients FOR SELECT TO authenticated USING (true);
CREATE POLICY "shared_account_insert" ON recipe_ingredients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "shared_account_update" ON recipe_ingredients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "shared_account_delete" ON recipe_ingredients FOR DELETE TO authenticated USING (true);

-- recipe_nutrition
CREATE POLICY "shared_account_select" ON recipe_nutrition FOR SELECT TO authenticated USING (true);
CREATE POLICY "shared_account_insert" ON recipe_nutrition FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "shared_account_update" ON recipe_nutrition FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "shared_account_delete" ON recipe_nutrition FOR DELETE TO authenticated USING (true);

-- quick_items
CREATE POLICY "shared_account_select" ON quick_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "shared_account_insert" ON quick_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "shared_account_update" ON quick_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "shared_account_delete" ON quick_items FOR DELETE TO authenticated USING (true);

-- daily_log_entries
CREATE POLICY "shared_account_select" ON daily_log_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "shared_account_insert" ON daily_log_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "shared_account_update" ON daily_log_entries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "shared_account_delete" ON daily_log_entries FOR DELETE TO authenticated USING (true);

-- daily_history
CREATE POLICY "shared_account_select" ON daily_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "shared_account_insert" ON daily_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "shared_account_update" ON daily_history FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "shared_account_delete" ON daily_history FOR DELETE TO authenticated USING (true);

-- weight_log
CREATE POLICY "shared_account_select" ON weight_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "shared_account_insert" ON weight_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "shared_account_update" ON weight_log FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "shared_account_delete" ON weight_log FOR DELETE TO authenticated USING (true);

-- user_targets
CREATE POLICY "shared_account_select" ON user_targets FOR SELECT TO authenticated USING (true);
CREATE POLICY "shared_account_insert" ON user_targets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "shared_account_update" ON user_targets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "shared_account_delete" ON user_targets FOR DELETE TO authenticated USING (true);

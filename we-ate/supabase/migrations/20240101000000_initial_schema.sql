-- =============================================================
-- We Ate — Initial Schema
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- =============================================================
-- TABLES
-- =============================================================

-- Recipes
-- type = 'split'  → Kat and Jeremiah have different ingredient amounts / nutrition
-- type = 'single' → Same amounts for both; one recipe_nutrition row is sufficient
CREATE TABLE recipes (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT        NOT NULL,
  type         TEXT        NOT NULL CHECK (type IN ('split', 'single')),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ingredients per recipe
-- kat_amount / jeremiah_amount are free-form text (e.g. "3 oz", "1 cup")
-- For 'single' recipes both columns will typically hold the same value
CREATE TABLE recipe_ingredients (
  id               UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id        UUID  NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_name  TEXT  NOT NULL,
  kat_amount       TEXT,
  jeremiah_amount  TEXT,
  sort_order       INT   NOT NULL DEFAULT 0
);

-- Nutrition per recipe per person
-- For 'single' recipes insert one row with person = 'kat' OR store two identical rows —
-- the app should read the row matching the active user (falling back to 'kat' if needed)
CREATE TABLE recipe_nutrition (
  id         UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id  UUID           NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  person     TEXT           NOT NULL CHECK (person IN ('kat', 'jeremiah')),
  calories   NUMERIC(7, 1)  NOT NULL,
  protein    NUMERIC(6, 1)  NOT NULL DEFAULT 0,
  carbs      NUMERIC(6, 1)  NOT NULL DEFAULT 0,
  fat        NUMERIC(6, 1)  NOT NULL DEFAULT 0,
  fiber      NUMERIC(6, 1),                       -- optional
  UNIQUE (recipe_id, person)
);

-- One-off items that don't need a full recipe
CREATE TABLE quick_items (
  id          UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT           NOT NULL,
  calories    NUMERIC(7, 1)  NOT NULL,
  protein     NUMERIC(6, 1)  NOT NULL DEFAULT 0,
  carbs       NUMERIC(6, 1)  NOT NULL DEFAULT 0,
  fat         NUMERIC(6, 1)  NOT NULL DEFAULT 0,
  fiber       NUMERIC(6, 1),                       -- optional
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Daily food log
-- Each entry links to EITHER a recipe OR a quick_item (enforced by constraint)
-- quantity multiplies the nutrition values from the linked source
CREATE TABLE daily_log_entries (
  id             UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  date           DATE           NOT NULL DEFAULT CURRENT_DATE,
  person         TEXT           NOT NULL CHECK (person IN ('kat', 'jeremiah')),
  meal_slot      TEXT           NOT NULL CHECK (meal_slot IN ('breakfast', 'lunch', 'dinner', 'snacks')),
  recipe_id      UUID           REFERENCES recipes(id)     ON DELETE SET NULL,
  quick_item_id  UUID           REFERENCES quick_items(id) ON DELETE SET NULL,
  quantity       NUMERIC(5, 2)  NOT NULL DEFAULT 1,
  logged_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT one_source_only CHECK (
    (recipe_id IS NOT NULL AND quick_item_id IS NULL) OR
    (recipe_id IS NULL     AND quick_item_id IS NOT NULL)
  )
);

-- Historical daily totals — populated by snapshot_daily_history()
-- Intended to be called at midnight before the log resets
CREATE TABLE daily_history (
  id              UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  date            DATE           NOT NULL,
  person          TEXT           NOT NULL CHECK (person IN ('kat', 'jeremiah')),
  total_calories  NUMERIC(7, 1)  NOT NULL DEFAULT 0,
  protein         NUMERIC(6, 1)  NOT NULL DEFAULT 0,
  carbs           NUMERIC(6, 1)  NOT NULL DEFAULT 0,
  fat             NUMERIC(6, 1)  NOT NULL DEFAULT 0,
  fiber           NUMERIC(6, 1),
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  UNIQUE (date, person)
);

-- Weight log — one entry per person per day
CREATE TABLE weight_log (
  id          UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  date        DATE           NOT NULL DEFAULT CURRENT_DATE,
  person      TEXT           NOT NULL CHECK (person IN ('kat', 'jeremiah')),
  weight_lbs  NUMERIC(5, 1)  NOT NULL,
  logged_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  UNIQUE (date, person)
);


-- =============================================================
-- INDEXES
-- =============================================================

CREATE INDEX idx_recipe_ingredients_recipe  ON recipe_ingredients (recipe_id);
CREATE INDEX idx_recipe_nutrition_recipe    ON recipe_nutrition    (recipe_id);
CREATE INDEX idx_log_entries_date_person    ON daily_log_entries   (date, person);
CREATE INDEX idx_log_entries_recipe         ON daily_log_entries   (recipe_id)     WHERE recipe_id IS NOT NULL;
CREATE INDEX idx_log_entries_quick_item     ON daily_log_entries   (quick_item_id) WHERE quick_item_id IS NOT NULL;
CREATE INDEX idx_daily_history_date_person  ON daily_history        (date, person);
CREATE INDEX idx_weight_log_date_person     ON weight_log           (date, person);


-- =============================================================
-- AUTO-UPDATE updated_at ON recipes
-- =============================================================

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


-- =============================================================
-- SNAPSHOT FUNCTION
-- Call this at midnight (via pg_cron or a Supabase Edge Function cron)
-- to archive the day's totals before the log rolls over.
-- =============================================================

CREATE OR REPLACE FUNCTION snapshot_daily_history(snapshot_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
BEGIN
  INSERT INTO daily_history (date, person, total_calories, protein, carbs, fat, fiber)
  SELECT
    e.date,
    e.person,

    COALESCE(SUM(
      CASE
        WHEN e.recipe_id      IS NOT NULL THEN rn.calories * e.quantity
        WHEN e.quick_item_id  IS NOT NULL THEN qi.calories * e.quantity
      END
    ), 0) AS total_calories,

    COALESCE(SUM(
      CASE
        WHEN e.recipe_id      IS NOT NULL THEN rn.protein * e.quantity
        WHEN e.quick_item_id  IS NOT NULL THEN qi.protein * e.quantity
      END
    ), 0) AS protein,

    COALESCE(SUM(
      CASE
        WHEN e.recipe_id      IS NOT NULL THEN rn.carbs * e.quantity
        WHEN e.quick_item_id  IS NOT NULL THEN qi.carbs * e.quantity
      END
    ), 0) AS carbs,

    COALESCE(SUM(
      CASE
        WHEN e.recipe_id      IS NOT NULL THEN rn.fat * e.quantity
        WHEN e.quick_item_id  IS NOT NULL THEN qi.fat * e.quantity
      END
    ), 0) AS fat,

    SUM(
      CASE
        WHEN e.recipe_id      IS NOT NULL THEN rn.fiber * e.quantity
        WHEN e.quick_item_id  IS NOT NULL THEN qi.fiber * e.quantity
      END
    ) AS fiber  -- stays NULL if no fiber data logged

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


-- =============================================================
-- ROW LEVEL SECURITY
-- Both Kat and Jeremiah share one Supabase auth account, so the
-- policy simply requires the request to be authenticated.
-- =============================================================

ALTER TABLE recipes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients  ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_nutrition    ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_log_entries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_history       ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_log          ENABLE ROW LEVEL SECURITY;

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

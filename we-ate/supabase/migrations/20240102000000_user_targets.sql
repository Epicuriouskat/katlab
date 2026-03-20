-- =============================================================
-- We Ate — User nutrition targets
-- =============================================================

CREATE TABLE user_targets (
  id         UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  person     TEXT           NOT NULL CHECK (person IN ('kat', 'jeremiah')),
  calories   NUMERIC(7, 1)  NOT NULL DEFAULT 2000,
  protein    NUMERIC(6, 1)  NOT NULL DEFAULT 150,
  carbs      NUMERIC(6, 1)  NOT NULL DEFAULT 200,
  fat        NUMERIC(6, 1)  NOT NULL DEFAULT 65,
  fiber      NUMERIC(6, 1),
  updated_at TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  UNIQUE (person)
);

CREATE TRIGGER user_targets_updated_at
  BEFORE UPDATE ON user_targets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE user_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shared_account_select" ON user_targets FOR SELECT TO authenticated USING (true);
CREATE POLICY "shared_account_insert" ON user_targets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "shared_account_update" ON user_targets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "shared_account_delete" ON user_targets FOR DELETE TO authenticated USING (true);

-- Seed sensible defaults (skipped if rows already exist)
INSERT INTO user_targets (person, calories, protein, carbs, fat, fiber)
VALUES
  ('kat',      1800, 130, 160, 60, NULL),
  ('jeremiah', 2400, 200, 220, 80, NULL)
ON CONFLICT (person) DO NOTHING;

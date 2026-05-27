-- When a quick_item is deleted, cascade to daily_log_entries rather than
-- SET NULL, which would violate the one_source_only check constraint.
ALTER TABLE daily_log_entries
  DROP CONSTRAINT IF EXISTS daily_log_entries_quick_item_id_fkey,
  ADD CONSTRAINT daily_log_entries_quick_item_id_fkey
    FOREIGN KEY (quick_item_id) REFERENCES quick_items(id) ON DELETE CASCADE;

-- Re-seed Kat and Jeremiah if they don't already exist.
-- Safe to run multiple times thanks to ON CONFLICT DO NOTHING.

INSERT INTO profiles (id, name, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Kat',      '2024-01-01 00:00:00+00'),
  ('00000000-0000-0000-0000-000000000002', 'Jeremiah', '2024-01-01 00:00:01+00')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS signup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  fid TEXT,
  display_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  plan TEXT
);

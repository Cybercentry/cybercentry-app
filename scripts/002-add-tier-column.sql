-- Add tier column to waitlist table
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS tier TEXT;

-- Create index for filtering by tier
CREATE INDEX IF NOT EXISTS idx_waitlist_tier ON waitlist(tier);

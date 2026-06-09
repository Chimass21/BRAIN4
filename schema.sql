-- ========================================================================
-- BRAIN EDUCATIONAL SUITE - SUPABASE DATABASE SCHEMAS
-- ========================================================================
-- This SQL script configures the required database table and access control
-- systems to sync your full-stack educational state to your Supabase project.
-- Run these commands inside your Supabase SQL Editor.
-- ========================================================================

-- 1. Create the persistent application state table
CREATE TABLE IF NOT EXISTS brain_state (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Insert the initial seed structure if it does not already exist
-- This ensures the backend has an initialized structure to read from on startup.
INSERT INTO brain_state (id, data)
VALUES (
  'primary_state',
  '{"users": [], "exams": [], "results": [], "lessonPlans": [], "lessonNotes": [], "transactions": [], "notifications": [], "documents": [], "reportSheets": [], "feedback": []}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- 3. Row Level Security (RLS) Configuration
-- Supabase projects default to strict RLS policies. To allow the fullstack server backend
-- to retrieve and persist state changes correctly, run these policies:

-- Enable Row Level Security on the state table
ALTER TABLE brain_state ENABLE ROW LEVEL SECURITY;

-- Policy A: Allow public anonymous reads to fetch state data
CREATE POLICY "Allow public read"
  ON brain_state
  FOR SELECT
  TO public
  USING (true);

-- Policy B: Allow public anonymous edits to insert/update data
CREATE POLICY "Allow public modifications"
  ON brain_state
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- 4. Enable Realtime updates (Optional)
-- If you want instant client sync updates, enable realtime on this table:
ALTER PUBLICATION supabase_realtime ADD TABLE brain_state;

-- ========================================================================
-- End of SQL Script
-- ========================================================================

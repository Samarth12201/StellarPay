-- Run this script in the Supabase SQL Editor

-- 1. Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create group_members table
CREATE TABLE IF NOT EXISTS group_members (
  id TEXT PRIMARY KEY,
  group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  avatarColor TEXT NOT NULL
);

-- 3. Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  totalAmount DOUBLE PRECISION NOT NULL,
  paidBy TEXT REFERENCES group_members(id) ON DELETE CASCADE,
  splitAmong TEXT[] NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  settled BOOLEAN DEFAULT FALSE
);

-- 4. Create payment_requests table
CREATE TABLE IF NOT EXISTS payment_requests (
  id TEXT PRIMARY KEY,
  groupId TEXT REFERENCES groups(id) ON DELETE CASCADE,
  groupName TEXT,
  fromAddress TEXT NOT NULL,
  toAddress TEXT NOT NULL,
  fromName TEXT NOT NULL,
  amount TEXT NOT NULL,
  memo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  txHash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create pools table
CREATE TABLE IF NOT EXISTS pools (
  id TEXT PRIMARY KEY,
  group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
  creator TEXT NOT NULL,
  title TEXT NOT NULL,
  target_amount DOUBLE PRECISION NOT NULL,
  balance DOUBLE PRECISION NOT NULL DEFAULT 0,
  closed BOOLEAN DEFAULT FALSE,
  asset TEXT NOT NULL DEFAULT 'XLM',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create user_profiles table (Level 4)
CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,               -- Stellar wallet address
  username TEXT NOT NULL DEFAULT '',
  preferred_currency TEXT NOT NULL DEFAULT 'USD',
  avatar_color TEXT NOT NULL DEFAULT '#7C3AED',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Create group_invitations table (Level 4)
CREATE TABLE IF NOT EXISTS group_invitations (
  id TEXT PRIMARY KEY,
  group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL,
  created_by TEXT NOT NULL,
  use_count INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER NOT NULL DEFAULT 50,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Create user_feedback table (Level 4)
CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL,
  feedback TEXT NOT NULL,
  rating INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security on all tables
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive for testnet MVP)
DO $$ BEGIN
  -- Drop existing policies to avoid conflicts on re-run
  DROP POLICY IF EXISTS "Enable all for groups" ON groups;
  DROP POLICY IF EXISTS "Enable all for group_members" ON group_members;
  DROP POLICY IF EXISTS "Enable all for expenses" ON expenses;
  DROP POLICY IF EXISTS "Enable all for payment_requests" ON payment_requests;
  DROP POLICY IF EXISTS "Enable all for pools" ON pools;
  DROP POLICY IF EXISTS "Enable all for user_profiles" ON user_profiles;
  DROP POLICY IF EXISTS "Enable all for group_invitations" ON group_invitations;
  DROP POLICY IF EXISTS "Enable insert for all users" ON user_feedback;
  DROP POLICY IF EXISTS "Enable select for all users" ON user_feedback;
END $$;

CREATE POLICY "Enable all for groups" ON groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for group_members" ON group_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for payment_requests" ON payment_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for pools" ON pools FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for user_profiles" ON user_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for group_invitations" ON group_invitations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable insert for all users" ON user_feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable select for all users" ON user_feedback FOR SELECT USING (true);

-- Enable Realtime for all tables
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE groups, group_members, expenses, pools, payment_requests, user_profiles, group_invitations, user_feedback;

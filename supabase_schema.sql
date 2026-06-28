-- Run this script in the Supabase SQL Editor

-- 1. Create groups table
CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create group_members table
CREATE TABLE group_members (
  id TEXT PRIMARY KEY,
  group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  avatarColor TEXT NOT NULL
);

-- 3. Create expenses table
CREATE TABLE expenses (
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
CREATE TABLE payment_requests (
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
CREATE TABLE pools (
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

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for groups" ON groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for group_members" ON group_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for payment_requests" ON payment_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for pools" ON pools FOR ALL USING (true) WITH CHECK (true);


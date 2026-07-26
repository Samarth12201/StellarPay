-- ============================================
-- StellarPay Level 4 Migration Script
-- Supabase project: stellarpay
-- ============================================

create table if not exists user_profiles (
  id text primary key,
  username text not null default '',
  preferred_currency text not null default 'USD',
  avatar_color text not null default '#7C3AED',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists group_invitations (
  id text primary key,
  group_id text references groups(id) on delete cascade,
  invite_code text unique not null,
  created_by text not null,
  use_count integer not null default 0,
  max_uses integer not null default 50,
  expires_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists user_feedback (
  id uuid primary key default gen_random_uuid(),
  address text not null,
  feedback text not null,
  rating integer check (rating between 1 and 5),
  created_at timestamptz default now()
);

alter table groups enable row level security;
alter table group_members enable row level security;
alter table expenses enable row level security;
alter table payment_requests enable row level security;
alter table pools enable row level security;
alter table user_profiles enable row level security;
alter table group_invitations enable row level security;
alter table user_feedback enable row level security;

drop policy if exists "Enable all for groups" on groups;
drop policy if exists "Enable all for group_members" on group_members;
drop policy if exists "Enable all for expenses" on expenses;
drop policy if exists "Enable all for payment_requests" on payment_requests;
drop policy if exists "Enable all for pools" on pools;
drop policy if exists "Enable all for user_profiles" on user_profiles;
drop policy if exists "Enable all for group_invitations" on group_invitations;
drop policy if exists "Enable insert for all users" on user_feedback;
drop policy if exists "Enable select for all users" on user_feedback;

create policy "Public read groups" on groups for select using (true);
create policy "Wallet app can create groups" on groups for insert with check (id <> '' and name <> '');
create policy "Wallet app can update groups" on groups for update using (id <> '') with check (id <> '' and name <> '');
create policy "Wallet app can delete groups" on groups for delete using (id <> '');

create policy "Public read group members" on group_members for select using (true);
create policy "Wallet app can create group members" on group_members for insert with check (address ~ '^G[A-Z2-7]{55}$');
create policy "Wallet app can update group members" on group_members for update using (address ~ '^G[A-Z2-7]{55}$') with check (address ~ '^G[A-Z2-7]{55}$');
create policy "Wallet app can delete group members" on group_members for delete using (address ~ '^G[A-Z2-7]{55}$');

create policy "Public read expenses" on expenses for select using (true);
create policy "Wallet app can create expenses" on expenses for insert with check (description <> '' and totalamount >= 0);
create policy "Wallet app can update expenses" on expenses for update using (id <> '') with check (description <> '' and totalamount >= 0);
create policy "Wallet app can delete expenses" on expenses for delete using (id <> '');

create policy "Public read payment requests" on payment_requests for select using (true);
create policy "Wallet app can create payment requests" on payment_requests for insert with check (fromaddress <> '' and toaddress <> '' and amount <> '');
create policy "Wallet app can update payment requests" on payment_requests for update using (id <> '') with check (fromaddress <> '' and toaddress <> '' and amount <> '');
create policy "Wallet app can delete payment requests" on payment_requests for delete using (id <> '');

create policy "Public read pools" on pools for select using (true);
create policy "Wallet app can create pools" on pools for insert with check (creator ~ '^G[A-Z2-7]{55}$' and target_amount >= 0);
create policy "Wallet app can update pools" on pools for update using (id <> '') with check (creator ~ '^G[A-Z2-7]{55}$' and target_amount >= 0);
create policy "Wallet app can delete pools" on pools for delete using (id <> '');

create policy "Public read profiles" on user_profiles for select using (true);
create policy "Wallet app can create profiles" on user_profiles for insert with check (id ~ '^G[A-Z2-7]{55}$');
create policy "Wallet app can update profiles" on user_profiles for update using (id ~ '^G[A-Z2-7]{55}$') with check (id ~ '^G[A-Z2-7]{55}$');

create policy "Public read invitations" on group_invitations for select using (true);
create policy "Wallet app can create invitations" on group_invitations for insert with check (created_by ~ '^G[A-Z2-7]{55}$' and invite_code <> '');
create policy "Wallet app can update invitations" on group_invitations for update using (id <> '') with check (invite_code <> '');

create policy "Public read feedback" on user_feedback for select using (true);
create policy "Wallet app can submit feedback" on user_feedback for insert with check (address ~ '^G[A-Z2-7]{55}$' and length(feedback) between 1 and 2000);

create index if not exists idx_expenses_group_id on expenses(group_id);
create index if not exists idx_expenses_paidby on expenses(paidby);
create index if not exists idx_group_invitations_group_id on group_invitations(group_id);
create index if not exists idx_group_members_group_id on group_members(group_id);
create index if not exists idx_payment_requests_groupid on payment_requests(groupid);
create index if not exists idx_pools_group_id on pools(group_id);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on groups, group_members, expenses, payment_requests, pools to anon, authenticated;
grant select, insert, update on user_profiles, group_invitations to anon, authenticated;
grant select, insert on user_feedback to anon, authenticated;

alter publication supabase_realtime add table user_profiles;
alter publication supabase_realtime add table group_invitations;
alter publication supabase_realtime add table user_feedback;

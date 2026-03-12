-- Run this in your Supabase SQL Editor

-- 1. Visitors table
create table if not exists visitors (
  id int primary key,
  count int default 0
);
insert into visitors (id, count) values (1, 0) on conflict do nothing;

-- 2. Likes table
create table if not exists likes (
  project text primary key,
  count int default 0
);

-- 3. Contact messages table
create table if not exists contact_messages (
  id uuid default gen_random_uuid() primary key,
  name text,
  email text,
  message text,
  created_at timestamp with time zone default now()
);

-- 4. Blog posts table
create table if not exists blog_posts (
  id uuid default gen_random_uuid() primary key,
  title text,
  content text,
  image text,
  date text,
  created_at timestamp with time zone default now()
);

-- 5. Enable public read/write (RLS off for simplicity)
alter table visitors enable row level security;
alter table likes enable row level security;
alter table contact_messages enable row level security;
alter table blog_posts enable row level security;

create policy "Allow all" on visitors for all using (true) with check (true);
create policy "Allow all" on likes for all using (true) with check (true);
create policy "Allow all" on contact_messages for all using (true) with check (true);
create policy "Allow all" on blog_posts for all using (true) with check (true);

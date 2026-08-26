# Bloom App — Supabase Setup Guide

The Trackers page requires Supabase database tables to store tracker data. Follow these steps to set them up.

## Step 1: Get Your Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and sign in to your project
2. Click **Project Settings** → **Database** 
3. Copy your **Project URL** and **Public API Key**
4. These should already be in `js/trackers.js` (lines 50-56)

## Step 2: Open the SQL Editor

1. In Supabase, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**

## Step 3: Create the Tracker Tables

Copy and paste the SQL from `supabase/trackers_schema.sql` into the SQL editor and run it.

**You can also copy the full SQL below:**

```sql
-- Bloom trackers schema + insight cache
-- Create sleep_logs table
create table if not exists public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  hours numeric(4,2) not null check (hours >= 0 and hours <= 24),
  quality integer not null default 3 check (quality between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create study_logs table
create table if not exists public.study_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  minutes integer not null check (minutes >= 0),
  started_at timestamptz not null default now(),
  topic text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create water_logs table
create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  logged_at timestamptz not null default now(),
  ml integer not null check (ml > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create insights table for cached analysis
create table if not exists public.insights (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  insight_type text not null check (insight_type in ('sleep_mood','habit_energy','study_window')),
  insight_text text not null,
  metadata jsonb not null default '{}',
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, insight_type)
);

-- Create indexes for performance
create index if not exists sleep_logs_profile_date_idx on public.sleep_logs (profile_id, date desc);
create index if not exists study_logs_profile_date_idx on public.study_logs (profile_id, date desc);
create index if not exists water_logs_profile_logged_idx on public.water_logs (profile_id, logged_at desc);
create index if not exists insights_profile_type_idx on public.insights (profile_id, insight_type);

-- Enable RLS (Row Level Security)
alter table public.sleep_logs enable row level security;
alter table public.study_logs enable row level security;
alter table public.water_logs enable row level security;
alter table public.insights enable row level security;

-- RLS policies for sleep_logs
create policy "Users can view own sleep logs" on public.sleep_logs for select using (auth.uid() = profile_id);
create policy "Users can insert own sleep logs" on public.sleep_logs for insert with check (auth.uid() = profile_id);
create policy "Users can update own sleep logs" on public.sleep_logs for update using (auth.uid() = profile_id);
create policy "Users can delete own sleep logs" on public.sleep_logs for delete using (auth.uid() = profile_id);

-- RLS policies for study_logs
create policy "Users can view own study logs" on public.study_logs for select using (auth.uid() = profile_id);
create policy "Users can insert own study logs" on public.study_logs for insert with check (auth.uid() = profile_id);
create policy "Users can update own study logs" on public.study_logs for update using (auth.uid() = profile_id);
create policy "Users can delete own study logs" on public.study_logs for delete using (auth.uid() = profile_id);

-- RLS policies for water_logs
create policy "Users can view own water logs" on public.water_logs for select using (auth.uid() = profile_id);
create policy "Users can insert own water logs" on public.water_logs for insert with check (auth.uid() = profile_id);
create policy "Users can update own water logs" on public.water_logs for update using (auth.uid() = profile_id);
create policy "Users can delete own water logs" on public.water_logs for delete using (auth.uid() = profile_id);

-- RLS policies for insights
create policy "Users can view own tracker insights" on public.insights for select using (auth.uid() = profile_id);
create policy "Users can upsert own tracker insights" on public.insights for insert with check (auth.uid() = profile_id);
create policy "Users can update own tracker insights" on public.insights for update using (auth.uid() = profile_id);
create policy "Users can delete own tracker insights" on public.insights for delete using (auth.uid() = profile_id);

-- Auto-update timestamp trigger
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger sleep_logs_set_updated_at before update on public.sleep_logs for each row execute procedure public.set_updated_at();
create or replace trigger study_logs_set_updated_at before update on public.study_logs for each row execute procedure public.set_updated_at();
create or replace trigger water_logs_set_updated_at before update on public.water_logs for each row execute procedure public.set_updated_at();
```

## Step 4: Verify the Tables Were Created

1. In Supabase, go to **Table Editor** (left sidebar)
2. You should see these new tables:
   - `sleep_logs`
   - `study_logs`
   - `water_logs`
   - `insights`

## Step 5: Test the Trackers Page

1. Refresh the Trackers page in your browser
2. The console errors should be gone
3. The cards should now load (with empty data until you add entries)

## Troubleshooting

### "Could not find the table" error
- Make sure you ran the entire SQL script above
- Check that you're connected to the right Supabase project
- Reload the page after running the SQL

### "403 Forbidden" or permission errors
- Make sure RLS policies were created (they're at the bottom of the SQL)
- Ensure you're logged in with a valid user

### Still getting 404 errors
- Check the browser console (F12 → Console tab)
- Make sure the Supabase URL and API key in `js/trackers.js` match your project

## What's Next?

Once the tables are created, you can:
1. Go to the **Trackers** page and click **+ Log** on any card to add data
2. The insights will automatically compute based on your logged data
3. Data will sync across devices via Supabase

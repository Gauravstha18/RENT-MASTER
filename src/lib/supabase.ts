import { createClient } from '@supabase/supabase-js';

// --- HARDCODED SUPABASE CREDENTIALS ---
// Paste your real Supabase project credentials below to embed them directly.
// This allows the app to load instantly on Vercel without asking for manual input!
const HARDCODED_SUPABASE_URL = ''; 
const HARDCODED_SUPABASE_ANON_KEY = '';

// Helper to validate that a URL starts with http:// or https://
const isValidUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

// Retrieve credentials from hardcoded constants OR environment variables OR localStorage fallback
const getSupabaseCredentials = () => {
  const metaEnv = (import.meta as any).env || {};
  console.log('Vite Node Environment MetaEnv:', metaEnv);
  
  let hardcodedUrl = (HARDCODED_SUPABASE_URL || '').trim();
  let hardcodedKey = (HARDCODED_SUPABASE_ANON_KEY || '').trim();

  let envUrl = (metaEnv.VITE_SUPABASE_URL || '').trim();
  let envKey = (metaEnv.VITE_SUPABASE_ANON_KEY || '').trim();

  // Strip literal quotes if present (e.g. from environment files)
  if (envUrl.startsWith('"') && envUrl.endsWith('"')) {
    envUrl = envUrl.substring(1, envUrl.length - 1).trim();
  }
  if (envUrl.startsWith("'") && envUrl.endsWith("'")) {
    envUrl = envUrl.substring(1, envUrl.length - 1).trim();
  }
  if (envKey.startsWith('"') && envKey.endsWith('"')) {
    envKey = envKey.substring(1, envKey.length - 1).trim();
  }
  if (envKey.startsWith("'") && envKey.endsWith("'")) {
    envKey = envKey.substring(1, envKey.length - 1).trim();
  }

  let localUrl = (localStorage.getItem('PROPS_SUPABASE_URL') || '').trim();
  let localKey = (localStorage.getItem('PROPS_SUPABASE_ANON_KEY') || '').trim();

  if (localUrl.startsWith('"') && localUrl.endsWith('"')) {
    localUrl = localUrl.substring(1, localUrl.length - 1).trim();
  }
  if (localUrl.startsWith("'") && localUrl.endsWith("'")) {
    localUrl = localUrl.substring(1, localUrl.length - 1).trim();
  }
  if (localKey.startsWith('"') && localKey.endsWith('"')) {
    localKey = localKey.substring(1, localKey.length - 1).trim();
  }
  if (localKey.startsWith("'") && localKey.endsWith("'")) {
    localKey = localKey.substring(1, localKey.length - 1).trim();
  }

  console.log('Supabase Connection Trial URLs:', { hardcodedUrl, envUrl, localUrl });

  const finalUrl = (isValidUrl(hardcodedUrl) ? hardcodedUrl : null) || (isValidUrl(envUrl) ? envUrl : null) || (isValidUrl(localUrl) ? localUrl : null) || '';
  const finalKey = finalUrl === hardcodedUrl ? hardcodedKey : (finalUrl === envUrl ? envKey : (finalUrl === localUrl ? localKey : ''));

  console.log('Supabase Connection Selected:', { finalUrl, hasKey: !!finalKey });

  return {
    url: finalUrl,
    key: finalKey,
    isEnv: !!(envUrl && envKey && isValidUrl(envUrl)),
    isConfigured: !!(finalUrl && finalKey)
  };
};

export const credentials = getSupabaseCredentials();

// Dummy/placeholder URL & Key to prevent compilation/runtime crashes when not configured
const defaultUrl = 'https://placeholder-url.supabase.co';
const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

export const supabase = createClient(
  credentials.url || defaultUrl,
  credentials.key || defaultKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

// Helpful SQL Setup snippet for the user to run in their Supabase console
export const SUPABASE_SQL_SETUP = `-- Copy and execute this in your Supabase SQL Editor to provision tables instantly:

-- 1. Create Houses Table
create table if not exists public.houses (
    id text primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    name text not null,
    address text not null,
    image_url text,
    floors jsonb,
    electricity_rate numeric,
    water_rate numeric,
    trash_collection_rate numeric,
    electricity_billing_type text,
    water_billing_type text,
    trash_billing_type text,
    is_deleted boolean default false,
    shared_with_emails jsonb default '[]'::jsonb,
    collaborators jsonb default '[]'::jsonb,
    owner_email text,
    owner_id uuid references auth.users(id) on delete cascade
);

-- Enable RLS
alter table public.houses enable row level security;
drop policy if exists "Allow select own houses" on public.houses;
create policy "Allow select own houses" on public.houses for select using (
  auth.uid() = owner_id or 
  auth.jwt() ->> 'email' in (select jsonb_array_elements_text(shared_with_emails)) or
  auth.jwt() ->> 'email' in (select value->>'email' from jsonb_array_elements(collaborators))
);
drop policy if exists "Allow insert own houses" on public.houses;
create policy "Allow insert own houses" on public.houses for insert with check (auth.uid() = owner_id);
drop policy if exists "Allow update own houses" on public.houses;
create policy "Allow update own houses" on public.houses for update using (
  auth.uid() = owner_id or 
  auth.jwt() ->> 'email' in (select jsonb_array_elements_text(shared_with_emails)) or
  auth.jwt() ->> 'email' in (select value->>'email' from jsonb_array_elements(collaborators) where value->>'role' = 'write')
);
drop policy if exists "Allow delete own houses" on public.houses;
create policy "Allow delete own houses" on public.houses for delete using (auth.uid() = owner_id);


-- 2. Create Rooms Table
create table if not exists public.rooms (
    id text primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    house_id text references public.houses(id) on delete cascade,
    room_number text not null,
    rent_amount numeric not null,
    floor text,
    previous_electricity_reading numeric,
    current_electricity_reading numeric,
    previous_water_reading numeric,
    current_water_reading numeric,
    owner_id uuid references auth.users(id) on delete cascade
);

alter table public.rooms enable row level security;
drop policy if exists "Allow select own rooms" on public.rooms;
create policy "Allow select own rooms" on public.rooms for select using (
  auth.uid() = owner_id or exists (
    select 1 from public.houses 
    where public.houses.id = house_id 
    and (
      auth.jwt() ->> 'email' in (select jsonb_array_elements_text(shared_with_emails)) or
      auth.jwt() ->> 'email' in (select value->>'email' from jsonb_array_elements(collaborators))
    )
  )
);
drop policy if exists "Allow insert own rooms" on public.rooms;
create policy "Allow insert own rooms" on public.rooms for insert with check (
  auth.uid() = owner_id or exists (
    select 1 from public.houses 
    where public.houses.id = house_id 
    and (
      auth.jwt() ->> 'email' in (select jsonb_array_elements_text(shared_with_emails)) or
      auth.jwt() ->> 'email' in (select value->>'email' from jsonb_array_elements(collaborators) where value->>'role' = 'write')
    )
  )
);
drop policy if exists "Allow update own rooms" on public.rooms;
create policy "Allow update own rooms" on public.rooms for update using (
  auth.uid() = owner_id or exists (
    select 1 from public.houses 
    where public.houses.id = house_id 
    and (
      auth.jwt() ->> 'email' in (select jsonb_array_elements_text(shared_with_emails)) or
      auth.jwt() ->> 'email' in (select value->>'email' from jsonb_array_elements(collaborators) where value->>'role' = 'write')
    )
  )
);
drop policy if exists "Allow delete own rooms" on public.rooms;
create policy "Allow delete own rooms" on public.rooms for delete using (auth.uid() = owner_id);


-- 3. Create Tenants Table
create table if not exists public.tenants (
    id text primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    house_id text references public.houses(id) on delete cascade,
    name text not null,
    phone text,
    room_ids jsonb,
    rent_mode text not null,
    custom_rent_amount numeric,
    start_date text,
    rent_cycle text,
    owner_id uuid references auth.users(id) on delete cascade
);

alter table public.tenants enable row level security;
drop policy if exists "Allow select own tenants" on public.tenants;
create policy "Allow select own tenants" on public.tenants for select using (
  auth.uid() = owner_id or exists (
    select 1 from public.houses 
    where public.houses.id = house_id 
    and (
      auth.jwt() ->> 'email' in (select jsonb_array_elements_text(shared_with_emails)) or
      auth.jwt() ->> 'email' in (select value->>'email' from jsonb_array_elements(collaborators))
    )
  )
);
drop policy if exists "Allow insert own tenants" on public.tenants;
create policy "Allow insert own tenants" on public.tenants for insert with check (
  auth.uid() = owner_id or exists (
    select 1 from public.houses 
    where public.houses.id = house_id 
    and (
      auth.jwt() ->> 'email' in (select jsonb_array_elements_text(shared_with_emails)) or
      auth.jwt() ->> 'email' in (select value->>'email' from jsonb_array_elements(collaborators) where value->>'role' = 'write')
    )
  )
);
drop policy if exists "Allow update own tenants" on public.tenants;
create policy "Allow update own tenants" on public.tenants for update using (
  auth.uid() = owner_id or exists (
    select 1 from public.houses 
    where public.houses.id = house_id 
    and (
      auth.jwt() ->> 'email' in (select jsonb_array_elements_text(shared_with_emails)) or
      auth.jwt() ->> 'email' in (select value->>'email' from jsonb_array_elements(collaborators) where value->>'role' = 'write')
    )
  )
);
drop policy if exists "Allow delete own tenants" on public.tenants;
create policy "Allow delete own tenants" on public.tenants for delete using (auth.uid() = owner_id);


-- 4. Create Payments Table
create table if not exists public.payments (
    id text primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    house_id text references public.houses(id) on delete cascade,
    tenant_id text references public.tenants(id) on delete cascade,
    month text not null,
    amount_due numeric not null,
    amount_paid numeric not null,
    payment_date text,
    status text not null,
    base_rent numeric,
    electricity_charge numeric,
    water_charge numeric,
    trash_charge numeric,
    other_charges numeric,
    owner_id uuid references auth.users(id) on delete cascade
);

alter table public.payments enable row level security;
drop policy if exists "Allow select own payments" on public.payments;
create policy "Allow select own payments" on public.payments for select using (
  auth.uid() = owner_id or exists (
    select 1 from public.houses 
    where public.houses.id = house_id 
    and (
      auth.jwt() ->> 'email' in (select jsonb_array_elements_text(shared_with_emails)) or
      auth.jwt() ->> 'email' in (select value->>'email' from jsonb_array_elements(collaborators))
    )
  )
);
drop policy if exists "Allow insert own payments" on public.payments;
create policy "Allow insert own payments" on public.payments for insert with check (
  auth.uid() = owner_id or exists (
    select 1 from public.houses 
    where public.houses.id = house_id 
    and (
      auth.jwt() ->> 'email' in (select jsonb_array_elements_text(shared_with_emails)) or
      auth.jwt() ->> 'email' in (select value->>'email' from jsonb_array_elements(collaborators) where value->>'role' = 'write')
    )
  )
);
drop policy if exists "Allow update own payments" on public.payments;
create policy "Allow update own payments" on public.payments for update using (
  auth.uid() = owner_id or exists (
    select 1 from public.houses 
    where public.houses.id = house_id 
    and (
      auth.jwt() ->> 'email' in (select jsonb_array_elements_text(shared_with_emails)) or
      auth.jwt() ->> 'email' in (select value->>'email' from jsonb_array_elements(collaborators) where value->>'role' = 'write')
    )
  )
);
drop policy if exists "Allow delete own payments" on public.payments;
create policy "Allow delete own payments" on public.payments for delete using (auth.uid() = owner_id);
`;

-- Pretoria Prime Recycling: run this whole file ONCE in Supabase > SQL Editor.

-- TABLES ---------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  address text,
  reference text unique,                 -- payment reference, e.g. PPR-3F9A21
  whatsapp_updates boolean default true,
  created_at timestamptz default now()
);

create table subscriptions (
  user_id uuid primary key references profiles(id) on delete cascade,
  plan text default 'Silver Lakes monthly plan',
  amount numeric(10,2) default 150,
  status text default 'active' check (status in ('active','paused','cancelled')),
  next_billing_date date
);

create table pickup_schedules (
  user_id uuid primary key references profiles(id) on delete cascade,
  weekly boolean default true,
  collection_day smallint default 3 check (collection_day between 1 and 7),  -- 1 = Monday ... 7 = Sunday
  materials text[] default '{}',
  address text,
  notes text,
  updated_at timestamptz default now()
);

create table pickups (                    -- one row per collection (you add these)
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  pickup_date date not null,
  status text default 'scheduled' check (status in ('scheduled','completed','missed')),
  weight_kg numeric(6,1),
  created_at timestamptz default now()
);

create table payments (                   -- one row per monthly payment (you add these)
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  paid_on date default current_date,
  amount numeric(10,2) not null,
  status text default 'paid' check (status in ('paid','pending','failed')),
  method text default 'EFT',
  created_at timestamptz default now()
);

create table notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text,
  kind text default 'info',
  read boolean default false,
  created_at timestamptz default now()
);

create table admins (user_id uuid primary key references auth.users(id));

create function is_admin() returns boolean
language sql security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

-- AUTOMATION -----------------------------------------------------------
-- When someone signs up, create their profile, plan, schedule and a welcome message.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, phone, address, reference)
  values (new.id,
          new.raw_user_meta_data->>'full_name',
          new.raw_user_meta_data->>'phone',
          new.raw_user_meta_data->>'address',
          'PPR-' || upper(substr(md5(new.id::text), 1, 6)));
  insert into subscriptions (user_id, next_billing_date)
  values (new.id, (date_trunc('month', now()) + interval '1 month')::date);
  insert into pickup_schedules (user_id, address)
  values (new.id, new.raw_user_meta_data->>'address');
  insert into notifications (user_id, title, body)
  values (new.id, 'Welcome to Pretoria Prime Recycling',
          'Choose your collection day and materials under Schedule.');
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users for each row execute function handle_new_user();

-- When you mark a pickup completed, the customer gets a notification.
create function notify_pickup() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'completed' and (tg_op = 'INSERT' or old.status is distinct from 'completed') then
    insert into notifications (user_id, title, body, kind)
    values (new.user_id, 'Pickup completed',
            to_char(new.pickup_date, 'FMDD Mon') || coalesce(' • ' || new.weight_kg || 'kg collected', ''),
            'pickup');
  end if;
  return new;
end $$;
create trigger on_pickup_change after insert or update on pickups
for each row execute function notify_pickup();

-- When you record a paid payment, the customer gets a notification.
create function notify_payment() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'paid' and (tg_op = 'INSERT' or old.status is distinct from 'paid') then
    insert into notifications (user_id, title, body, kind)
    values (new.user_id, 'Payment successful', 'R' || new.amount || ' received. Thank you!', 'payment');
  end if;
  return new;
end $$;
create trigger on_payment_change after insert or update on payments
for each row execute function notify_payment();

-- SECURITY (Row Level Security): customers only ever see their own data ---
alter table profiles enable row level security;
alter table subscriptions enable row level security;
alter table pickup_schedules enable row level security;
alter table pickups enable row level security;
alter table payments enable row level security;
alter table notifications enable row level security;
alter table admins enable row level security;

create policy "own profile read" on profiles for select using (auth.uid() = id);
create policy "own profile edit" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "own subscription" on subscriptions for select using (auth.uid() = user_id);
create policy "own schedule read" on pickup_schedules for select using (auth.uid() = user_id);
create policy "own schedule insert" on pickup_schedules for insert with check (auth.uid() = user_id);
create policy "own schedule edit" on pickup_schedules for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own pickups" on pickups for select using (auth.uid() = user_id);
create policy "own payments" on payments for select using (auth.uid() = user_id);
create policy "own notifications read" on notifications for select using (auth.uid() = user_id);
create policy "own notifications edit" on notifications for update using (auth.uid() = user_id);
create policy "own notifications delete" on notifications for delete using (auth.uid() = user_id);

-- Staff (listed in admins) can see and manage everything.
create policy "admin profiles" on profiles for all using (is_admin());
create policy "admin subscriptions" on subscriptions for all using (is_admin());
create policy "admin schedules" on pickup_schedules for all using (is_admin());
create policy "admin pickups" on pickups for all using (is_admin());
create policy "admin payments" on payments for all using (is_admin());
create policy "admin notifications" on notifications for all using (is_admin());

-- Customers may only change these columns, never their payment reference.
revoke update on profiles from authenticated;
grant update (full_name, phone, address, whatsapp_updates) on profiles to authenticated;
revoke update on notifications from authenticated;
grant update (read) on notifications to authenticated;

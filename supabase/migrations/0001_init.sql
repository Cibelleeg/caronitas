-- Caronitas: schema inicial (perfis, configuração, padrões recorrentes,
-- caronas, participação por carona, pagamentos) + RLS.

create extension if not exists "pgcrypto";

create type user_role as enum ('driver', 'passenger');
create type ride_status as enum ('scheduled', 'cancelled');
create type participation_status as enum ('confirmed', 'declined', 'no_show');
create type participation_source as enum ('recurring', 'manual');

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text,
  role user_role not null default 'passenger',
  created_at timestamptz not null default now()
);

create table app_settings (
  id boolean primary key default true,
  seats_per_ride int not null default 4 check (seats_per_ride > 0),
  default_price numeric(10, 2) not null default 5.00 check (default_price >= 0),
  semester_start date,
  semester_end date,
  constraint app_settings_single_row check (id)
);

insert into app_settings (id) values (true);

create table recurring_patterns (
  id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null references profiles (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  period text not null default 'manhã',
  price numeric(10, 2) not null check (price >= 0),
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table rides (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  period text not null default 'manhã',
  status ride_status not null default 'scheduled',
  notes text,
  created_at timestamptz not null default now(),
  unique (date, period)
);

create table ride_passengers (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references rides (id) on delete cascade,
  passenger_id uuid not null references profiles (id) on delete cascade,
  status participation_status not null default 'confirmed',
  price numeric(10, 2) not null check (price >= 0),
  source participation_source not null default 'manual',
  created_at timestamptz not null default now(),
  unique (ride_id, passenger_id)
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null references profiles (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  paid_at date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create index recurring_patterns_passenger_idx on recurring_patterns (passenger_id);
create index ride_passengers_ride_idx on ride_passengers (ride_id);
create index ride_passengers_passenger_idx on ride_passengers (passenger_id);
create index payments_passenger_idx on payments (passenger_id);

-- ---------------------------------------------------------------------------
-- Funções auxiliares (security definer para evitar recursão de RLS)
-- ---------------------------------------------------------------------------

create or replace function public.is_driver()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'driver'
  );
$$;

create or replace function public.ride_confirmed_count(p_ride_id uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::int from ride_passengers
  where ride_id = p_ride_id and status = 'confirmed';
$$;

-- Cria automaticamente um perfil (papel padrão: passageiro) quando alguém
-- se cadastra via Supabase Auth. A primeira usuária (motorista) precisa ter
-- seu papel promovido manualmente uma vez — ver README.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'passenger'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table profiles enable row level security;
alter table app_settings enable row level security;
alter table recurring_patterns enable row level security;
alter table rides enable row level security;
alter table ride_passengers enable row level security;
alter table payments enable row level security;

-- profiles: cada um vê o próprio perfil; motorista vê e edita todos.
create policy "profiles_select_own_or_driver" on profiles
  for select using (id = auth.uid() or public.is_driver());

create policy "profiles_driver_write" on profiles
  for all using (public.is_driver()) with check (public.is_driver());

-- app_settings: leitura para qualquer usuário autenticado; escrita só motorista.
create policy "app_settings_select_authenticated" on app_settings
  for select using (auth.uid() is not null);

create policy "app_settings_driver_write" on app_settings
  for all using (public.is_driver()) with check (public.is_driver());

-- recurring_patterns: passageiro vê os próprios; motorista vê/edita tudo.
create policy "recurring_patterns_select_own_or_driver" on recurring_patterns
  for select using (passenger_id = auth.uid() or public.is_driver());

create policy "recurring_patterns_driver_write" on recurring_patterns
  for all using (public.is_driver()) with check (public.is_driver());

-- rides: qualquer autenticado vê a agenda; só motorista cria/edita/exclui.
create policy "rides_select_authenticated" on rides
  for select using (auth.uid() is not null);

create policy "rides_driver_write" on rides
  for all using (public.is_driver()) with check (public.is_driver());

-- ride_passengers: cada um vê as próprias participações; motorista vê todas.
create policy "ride_passengers_select_own_or_driver" on ride_passengers
  for select using (passenger_id = auth.uid() or public.is_driver());

-- Passageiro confirma presença numa carona futura (não passada) para si mesmo.
create policy "ride_passengers_self_insert" on ride_passengers
  for insert with check (
    passenger_id = auth.uid()
    and exists (
      select 1 from rides r
      where r.id = ride_id and r.date >= current_date
    )
  );

-- Passageiro só altera o próprio status, e só enquanto a carona é futura.
create policy "ride_passengers_self_update" on ride_passengers
  for update using (
    passenger_id = auth.uid()
    and exists (
      select 1 from rides r
      where r.id = ride_id and r.date >= current_date
    )
  )
  with check (passenger_id = auth.uid());

create policy "ride_passengers_driver_write" on ride_passengers
  for all using (public.is_driver()) with check (public.is_driver());

-- payments: passageiro vê os próprios pagamentos; só motorista registra/edita.
create policy "payments_select_own_or_driver" on payments
  for select using (passenger_id = auth.uid() or public.is_driver());

create policy "payments_driver_write" on payments
  for all using (public.is_driver()) with check (public.is_driver());

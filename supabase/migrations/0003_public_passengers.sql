--


create table passengers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null unique,
  created_at timestamptz not null default now()
);

alter table passengers enable row level security;

create policy "passengers_driver_all" on passengers
  for all using (public.is_driver()) with check (public.is_driver());


alter table ride_passengers drop constraint ride_passengers_passenger_id_fkey;
alter table ride_passengers
  add constraint ride_passengers_passenger_id_fkey
  foreign key (passenger_id) references passengers (id) on delete cascade;

alter table recurring_patterns drop constraint recurring_patterns_passenger_id_fkey;
alter table recurring_patterns
  add constraint recurring_patterns_passenger_id_fkey
  foreign key (passenger_id) references passengers (id) on delete cascade;

alter table payments drop constraint payments_passenger_id_fkey;
alter table payments
  add constraint payments_passenger_id_fkey
  foreign key (passenger_id) references passengers (id) on delete cascade;


drop trigger ride_passengers_self_update_guard on ride_passengers;
drop function public.enforce_ride_passenger_self_update();

drop policy "ride_passengers_select_own_or_driver" on ride_passengers;
drop policy "ride_passengers_self_insert" on ride_passengers;
drop policy "ride_passengers_self_update" on ride_passengers;

drop policy "recurring_patterns_select_own_or_driver" on recurring_patterns;

drop policy "payments_select_own_or_driver" on payments;


alter policy "rides_select_authenticated" on rides using (true);
alter policy "horarios_select_authenticated" on horarios using (true);
alter policy "app_settings_select_authenticated" on app_settings using (true);

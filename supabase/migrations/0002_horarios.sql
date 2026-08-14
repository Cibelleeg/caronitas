--


create table horarios (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  time_of_day time,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table horarios enable row level security;

create policy "horarios_select_authenticated" on horarios
  for select using (auth.uid() is not null);

create policy "horarios_driver_write" on horarios
  for all using (public.is_driver()) with check (public.is_driver());


alter table rides drop constraint rides_date_period_key;

alter table rides
  add column horario_id uuid references horarios (id) on delete restrict,
  add column label text,
  add column time_of_day time;

update rides set label = period where label is null;

alter table rides
  alter column label set not null,
  drop column period;

alter table rides
  alter column horario_id set not null;

alter table rides add constraint rides_date_horario_key unique (date, horario_id);


alter table recurring_patterns
  add column horario_id uuid references horarios (id) on delete restrict;

alter table recurring_patterns
  alter column horario_id set not null,
  drop column period;


alter type participation_status add value 'pending';


drop policy "ride_passengers_self_insert" on ride_passengers;

create policy "ride_passengers_self_insert" on ride_passengers
  for insert with check (
    passenger_id = auth.uid()
    and status = 'pending'
    and exists (
      select 1 from rides r
      where r.id = ride_id and r.date >= current_date and r.status = 'scheduled'
    )
  );


create or replace function public.enforce_ride_passenger_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_driver() then
    return new;
  end if;

  if auth.uid() is distinct from old.passenger_id then
    raise exception 'não autorizado';
  end if;

  if new.passenger_id is distinct from old.passenger_id
    or new.ride_id is distinct from old.ride_id
    or new.price is distinct from old.price
    or new.source is distinct from old.source then
    raise exception 'passageiro só pode alterar o próprio status';
  end if;

  if new.status = 'declined' and old.status in ('confirmed', 'pending') then
    return new;
  end if;

  if new.status = 'confirmed' and old.status = 'declined' and old.source = 'recurring' then
    return new;
  end if;

  raise exception 'transição de status não permitida para o passageiro';
end;
$$;

create trigger ride_passengers_self_update_guard
  before update on ride_passengers
  for each row execute function public.enforce_ride_passenger_self_update();

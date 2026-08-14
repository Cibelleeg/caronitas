
create or replace function public.ride_passenger_names(p_ride_ids uuid[])
returns table (ride_id uuid, full_name text)
language sql
security definer
set search_path = public
stable
as $$
  select rp.ride_id, p.full_name
  from ride_passengers rp
  join passengers p on p.id = rp.passenger_id
  join rides r on r.id = rp.ride_id
  where rp.ride_id = any(p_ride_ids)
    and rp.status = 'confirmed'
    and r.status = 'scheduled'
  order by p.full_name;
$$;

revoke all on function public.ride_passenger_names(uuid[]) from public;
grant execute on function public.ride_passenger_names(uuid[]) to anon, authenticated;

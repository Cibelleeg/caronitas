
alter table rides add column ride_type text;

update rides
set ride_type = case
  when lower(label) like 'volta%' then 'volta'
  else 'ida'
end
where ride_type is null;

alter table rides
  alter column ride_type set default 'ida',
  alter column ride_type set not null,
  add constraint rides_ride_type_check check (ride_type in ('ida', 'volta'));


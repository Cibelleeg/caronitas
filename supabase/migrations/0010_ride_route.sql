
alter table rides
  add column origin text,
  add column destination text;

update rides
set
  origin = case when ride_type = 'volta' then 'Destino anterior' else 'Origem não informada' end,
  destination = case when ride_type = 'volta' then 'Origem anterior' else 'Destino não informado' end
where origin is null or destination is null;

alter table rides
  alter column origin set not null,
  alter column destination set not null,
  add constraint rides_origin_not_blank check (length(trim(origin)) > 0),
  add constraint rides_destination_not_blank check (length(trim(destination)) > 0);

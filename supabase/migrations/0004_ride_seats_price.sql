
alter table rides
  add column seats_total int,
  add column default_price numeric(10, 2);

update rides r
set
  seats_total = coalesce(r.seats_total, s.seats_per_ride),
  default_price = coalesce(r.default_price, s.default_price)
from app_settings s
where s.id = true;

alter table rides
  alter column seats_total set default 4,
  alter column seats_total set not null,
  add constraint rides_seats_total_check check (seats_total > 0);

alter table rides
  alter column default_price set default 5.00,
  alter column default_price set not null,
  add constraint rides_default_price_check check (default_price >= 0);

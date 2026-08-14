
alter table horarios
  add column seats_total int,
  add column default_price numeric(10, 2);

update horarios h
set
  seats_total = coalesce(h.seats_total, s.seats_per_ride),
  default_price = coalesce(h.default_price, s.default_price)
from app_settings s
where s.id = true;

alter table horarios
  alter column seats_total set default 4,
  alter column seats_total set not null,
  add constraint horarios_seats_total_check check (seats_total > 0);

alter table horarios
  alter column default_price set default 5.00,
  alter column default_price set not null,
  add constraint horarios_default_price_check check (default_price >= 0);

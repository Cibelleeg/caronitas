
alter table payments
  add column ride_passenger_id uuid unique
  references ride_passengers (id) on delete set null;

create index payments_ride_passenger_idx on payments (ride_passenger_id);


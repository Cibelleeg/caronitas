
alter table rides add column series_id uuid;
create index rides_series_idx on rides (series_id, date);


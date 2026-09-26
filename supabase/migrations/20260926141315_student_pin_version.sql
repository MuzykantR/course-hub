-- Bumped whenever a PIN is set or reset; identified sessions carry it, so a reset
-- immediately strips the identity from every session that was bound with the old PIN.
alter table public.students add column pin_version integer not null default 0 check (pin_version >= 0);

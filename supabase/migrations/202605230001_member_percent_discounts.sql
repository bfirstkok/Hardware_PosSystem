update public.discount_rules
set discount_type = 'percent',
    applies_to = 'member',
    value = least(greatest(value, 1), 100)
where discount_type <> 'percent'
   or applies_to <> 'member'
   or value < 1
   or value > 100;

alter table public.discount_rules alter column discount_type set default 'percent';
alter table public.discount_rules alter column applies_to set default 'member';
alter table public.discount_rules alter column value set default 1;

alter table public.discount_rules drop constraint if exists discount_rules_discount_type_check;
alter table public.discount_rules add constraint discount_rules_discount_type_check
  check (discount_type = 'percent');

alter table public.discount_rules drop constraint if exists discount_rules_applies_to_check;
alter table public.discount_rules add constraint discount_rules_applies_to_check
  check (applies_to = 'member');

alter table public.discount_rules drop constraint if exists discount_rules_value_check;
alter table public.discount_rules add constraint discount_rules_value_check
  check (value >= 1 and value <= 100);

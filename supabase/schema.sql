-- =====================================================================
-- Culte — ФИНАЛЕН SQL (Supabase / Postgres)
-- ВНИМАНИЕ: ИЗТРИВА ЦЯЛАТА БАЗА НА САЙТА (всички таблици, данни,
-- функции и типове) и я създава наново със seed данни.
-- Пуска се целият файл наведнъж в SQL Editor.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Нулиране
-- ---------------------------------------------------------------------
drop table if exists
  order_items, orders, shipping_methods, products, categories,
  booking_services, bookings, services, blocked_periods, business_hours,
  settings, stripe_events, admin_login_attempts, withdrawal_requests
  cascade;

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('set_updated_at', 'expire_stale_bookings', 'order_deduct_stock',
                        'order_restore_stock', 'create_order', 'cleanup_stale_data')
  loop
    execute 'drop function if exists ' || r.sig || ' cascade';
  end loop;
end $$;

drop type if exists
  dog_size, booking_status, booking_source, order_status, payment_method,
  service_group, delivery_type, withdrawal_kind, withdrawal_status
  cascade;


create extension if not exists btree_gist;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Enum-и
-- ---------------------------------------------------------------------
create type dog_size as enum ('small', 'medium', 'large');
create type booking_status as enum ('pending_payment', 'confirmed', 'completed', 'cancelled', 'expired');
create type booking_source as enum ('online', 'manual');
create type order_status as enum ('pending_payment', 'new', 'processing', 'shipped', 'delivered', 'cancelled', 'expired', 'stock_issue');
create type payment_method as enum ('stripe', 'cod');
create type service_group as enum ('breed', 'weight', 'extra');
create type delivery_type as enum ('address', 'office', 'pickup', 'locker');

-- ---------------------------------------------------------------------
-- updated_at тригер
-- ---------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Настройки (ключ → jsonb стойност)
-- ---------------------------------------------------------------------
create table settings (
  key         text primary key,
  value       jsonb not null,
  label       text not null default '',
  is_public   boolean not null default true,
  updated_at  timestamptz not null default now()
);
create trigger settings_updated before update on settings for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Работно време (0 = неделя ... 6 = събота, като extract(dow))
-- ---------------------------------------------------------------------
create table business_hours (
  weekday     smallint primary key check (weekday between 0 and 6),
  is_closed   boolean not null default false,
  open_time   time not null default '09:00',
  close_time  time not null default '18:00',
  updated_at  timestamptz not null default now(),
  check (is_closed or close_time > open_time)
);
create trigger business_hours_updated before update on business_hours for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Блокирани периоди (отпуск, обучение и т.н.)
-- ---------------------------------------------------------------------
create table blocked_periods (
  id          uuid primary key default gen_random_uuid(),
  start_at    timestamptz not null,
  end_at      timestamptz not null,
  reason      text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (end_at > start_at)
);
create index blocked_periods_range_idx on blocked_periods using gist (tstzrange(start_at, end_at));
create trigger blocked_periods_updated before update on blocked_periods for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Услуги
-- ---------------------------------------------------------------------
create table services (
  id            uuid primary key default gen_random_uuid(),
  size          dog_size not null,
  name          text not null,
  description   text not null default '',
  duration_min  integer not null check (duration_min > 0),
  duration_max  integer not null check (duration_max >= duration_min),
  price_from    numeric(10,2) not null check (price_from >= 0),
  price_to      numeric(10,2) not null,
  is_addon      boolean not null default false,  -- само като допълнителна услуга
  addon_allowed boolean not null default false,  -- може да се добави към основна услуга
  group_name    service_group not null default 'weight',
  includes      text not null default '',        -- „Включва: …“
  breeds        text not null default '',        -- примерни породи
  deposit       numeric(10,2) check (deposit is null or deposit >= 0), -- null = по правилото
  is_active     boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (price_to >= price_from)
);
create index services_size_idx on services (size, sort_order) where is_active;
create trigger services_updated before update on services for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Резервации
-- ---------------------------------------------------------------------
create table bookings (
  id                        uuid primary key default gen_random_uuid(),
  number                    bigint generated always as identity (start with 5001) unique,
  status                   booking_status not null default 'pending_payment',
  source                    booking_source not null default 'online',
  size                      dog_size not null,
  start_at                  timestamptz not null,
  end_at                    timestamptz not null,
  customer_name             text not null,
  customer_email            text not null default '',
  customer_phone            text not null,
  dog_name                  text not null default '',
  dog_breed                 text not null default '',
  message                   text not null default '',
  total_from                numeric(10,2) not null default 0,
  total_to                  numeric(10,2) not null default 0,
  deposit_amount            numeric(10,2) not null default 0,
  deposit_paid              boolean not null default false,
  stripe_session_id         text unique,
  stripe_payment_intent_id  text,
  refund_id                 text,
  refunded_at               timestamptz,
  admin_note                text not null default '',
  reminder_sent_at          timestamptz,
  terms_accepted_at         timestamptz,
  -- Изрично искане услугата да се изпълни в 14-дневния срок за отказ (чл. 55, ал. 3 ЗЗП)
  service_consent_at        timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  check (end_at > start_at),
  -- Само едно куче наведнъж: без застъпване за активни резервации
  constraint bookings_no_overlap exclude using gist (
    tstzrange(start_at, end_at, '[)') with &&
  ) where (status in ('pending_payment', 'confirmed'))
);
create index bookings_start_idx on bookings (start_at);
create index bookings_status_idx on bookings (status, created_at);
create trigger bookings_updated before update on bookings for each row execute function set_updated_at();

create table booking_services (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references bookings(id) on delete cascade,
  service_id    uuid references services(id) on delete set null,
  name          text not null,
  is_main       boolean not null default false,
  duration_max  integer not null,
  price_from    numeric(10,2) not null,
  price_to      numeric(10,2) not null
);
create index booking_services_booking_idx on booking_services (booking_id);

-- Маркира като изтекли всички pending_payment, по-стари от p_minutes
create or replace function expire_stale_bookings(p_minutes integer default 35) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update bookings set status = 'expired'
   where status = 'pending_payment'
     and source = 'online'
     and created_at < now() - make_interval(mins => p_minutes);
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------------
-- Категории и продукти
-- ---------------------------------------------------------------------
create table categories (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  description  text not null default '',
  sort_order   integer not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger categories_updated before update on categories for each row execute function set_updated_at();

create table products (
  id               uuid primary key default gen_random_uuid(),
  category_id      uuid references categories(id) on delete set null,
  name             text not null,
  slug             text not null unique,
  description      text not null default '',
  price            numeric(10,2) not null check (price >= 0),
  stock            integer not null default 0 check (stock >= 0),
  is_active        boolean not null default true,
  image_public_id  text,
  -- Регламент (ЕС) 2023/988 (GPSR): производител/отговорно лице и информация за безопасност
  manufacturer     text not null default '',
  safety_info      text not null default '',
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index products_category_idx on products (category_id) where is_active;
create index products_active_idx on products (is_active, sort_order);
create index products_search_idx on products using gin (to_tsvector('simple', name || ' ' || description));
create trigger products_updated before update on products for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Методи на доставка
-- provider: 'manual' днес; по-късно 'econt' / 'speedy' (виж lib/shipping)
-- ---------------------------------------------------------------------
create table shipping_methods (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text not null default '',
  provider     text not null default 'manual',
  delivery     delivery_type not null default 'address',
  price        numeric(10,2) not null default 0 check (price >= 0),
  free_over    numeric(10,2),
  is_active    boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger shipping_methods_updated before update on shipping_methods for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Поръчки
-- ---------------------------------------------------------------------
create table orders (
  id                        uuid primary key default gen_random_uuid(),
  number                    bigint generated always as identity (start with 1001) unique,
  status                    order_status not null default 'pending_payment',
  payment_method            payment_method not null,
  paid_at                   timestamptz,
  customer_name             text not null,
  customer_email            text not null,
  customer_phone            text not null,
  city                      text not null,
  delivery                  delivery_type not null default 'address',
  address                   text not null default '',
  note                      text not null default '',
  shipping_method_id        uuid references shipping_methods(id) on delete set null,
  shipping_name             text not null default '',
  shipping_price            numeric(10,2) not null default 0,
  subtotal                  numeric(10,2) not null default 0,
  total                     numeric(10,2) not null default 0,
  stock_deducted            boolean not null default false,
  stripe_session_id         text unique,
  stripe_payment_intent_id  text,
  tracking_number           text not null default '',
  admin_note                text not null default '',
  shipped_at                timestamptz,
  refund_id                 text,
  refunded_at               timestamptz,
  -- Фактура по желание: {company, eik, vat, address, mol}
  invoice_requested         boolean not null default false,
  invoice_details           jsonb not null default '{}'::jsonb,
  terms_accepted_at         timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create index orders_status_idx on orders (status, created_at desc);
create index orders_email_idx on orders (lower(customer_email));
create trigger orders_updated before update on orders for each row execute function set_updated_at();

create table order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  product_id  uuid references products(id) on delete set null,
  name        text not null,
  price       numeric(10,2) not null,
  quantity    integer not null check (quantity > 0)
);
create index order_items_order_idx on order_items (order_id);

-- Идемпотентност на Stripe webhook-а
create table stripe_events (
  id          text primary key,
  type        text not null,
  created_at  timestamptz not null default now()
);

-- Ограничение на опитите за вход в админ панела
create table admin_login_attempts (
  id          bigint generated always as identity primary key,
  ip          text not null,
  success     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index admin_login_attempts_ip_idx on admin_login_attempts (ip, created_at desc);

-- ---------------------------------------------------------------------
-- Отказ от договор (функция за отказ, чл. 11а Директива 2011/83/ЕС,
-- изм. с Директива (ЕС) 2023/2673 — в сила от 19.06.2026)
-- ---------------------------------------------------------------------
create type withdrawal_kind as enum ('order', 'booking');
create type withdrawal_status as enum ('received', 'processed', 'rejected');

create table withdrawal_requests (
  id              uuid primary key default gen_random_uuid(),
  number          bigint generated always as identity (start with 1) unique,
  kind            withdrawal_kind not null,
  order_id        uuid references orders(id) on delete set null,
  booking_id      uuid references bookings(id) on delete set null,
  reference       text not null,          -- номер на поръчка/резервация, както е въведен
  customer_name   text not null,
  customer_email  text not null,
  items           text not null default '', -- кои продукти (празно = цялата поръчка)
  reason          text not null default '', -- по желание, не е задължително
  status          withdrawal_status not null default 'received',
  admin_note      text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index withdrawal_requests_status_idx on withdrawal_requests (status, created_at desc);
create trigger withdrawal_requests_updated before update on withdrawal_requests for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Атомарни наличности
-- ---------------------------------------------------------------------

-- Намалява наличностите за поръчка в една транзакция.
-- Заключва редовете на продуктите (в стабилен ред, без deadlock),
-- проверява всички и чак тогава намалява. Идемпотентна чрез stock_deducted.
create or replace function order_deduct_stock(p_order_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_order  orders%rowtype;
  v_short  integer;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_order.stock_deducted then return true; end if;

  perform 1 from products p
    where p.id in (select product_id from order_items where order_id = p_order_id)
    order by p.id
    for update;

  select count(*) into v_short
    from (select product_id, sum(quantity) as qty from order_items
           where order_id = p_order_id group by product_id) i
    left join products p on p.id = i.product_id
   where p.id is null or p.stock < i.qty;

  if v_short > 0 then return false; end if;

  update products p set stock = p.stock - i.qty
    from (select product_id, sum(quantity) as qty from order_items
           where order_id = p_order_id group by product_id) i
   where p.id = i.product_id;

  update orders set stock_deducted = true where id = p_order_id;
  return true;
end $$;

-- Връща бройките при отказ. Идемпотентна.
create or replace function order_restore_stock(p_order_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_deducted boolean;
begin
  select stock_deducted into v_deducted from orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if not v_deducted then return false; end if;

  update products p set stock = p.stock + i.qty
    from (select product_id, sum(quantity) as qty from order_items
           where order_id = p_order_id and product_id is not null group by product_id) i
   where p.id = i.product_id;

  update orders set stock_deducted = false where id = p_order_id;
  return true;
end $$;

-- Създава поръчка с цени от базата (не от клиента).
-- p_items: [{"product_id": "...", "quantity": 2}, ...]
-- p_deduct = true (наложен платеж) → намалява наличностите в същата транзакция;
-- при липса на наличност хвърля 'insufficient_stock' и нищо не се записва.
-- p_deduct = false (Stripe) → само проверява наличността.
create or replace function create_order(
  p_customer            jsonb,
  p_items               jsonb,
  p_shipping_method_id  uuid,
  p_payment_method      payment_method,
  p_deduct              boolean
) returns orders
language plpgsql security definer set search_path = public as $$
declare
  v_order     orders%rowtype;
  v_ship      shipping_methods%rowtype;
  v_ids       uuid[];
  v_qtys      integer[];
  v_subtotal  numeric(10,2);
  v_shipping  numeric(10,2);
  v_bad       integer;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_cart';
  end if;

  select * into v_ship from shipping_methods where id = p_shipping_method_id and is_active;
  if not found then raise exception 'invalid_shipping'; end if;

  -- Обединяваме повтарящи се продукти, подредени по id (стабилен ред на заключване)
  select array_agg(pid order by pid), array_agg(qty order by pid)
    into v_ids, v_qtys
    from (select (e->>'product_id')::uuid as pid, sum((e->>'quantity')::int)::int as qty
            from jsonb_array_elements(p_items) e group by 1) x;

  if exists (select 1 from unnest(v_qtys) q where q <= 0 or q > 999) then
    raise exception 'invalid_quantity';
  end if;

  perform 1 from products where id = any(v_ids) order by id for update;

  select count(*) into v_bad
    from unnest(v_ids, v_qtys) as i(pid, qty)
    left join products p on p.id = i.pid and p.is_active
   where p.id is null or p.stock < i.qty;
  if v_bad > 0 then raise exception 'insufficient_stock'; end if;

  select coalesce(sum(p.price * i.qty), 0) into v_subtotal
    from unnest(v_ids, v_qtys) as i(pid, qty) join products p on p.id = i.pid;

  v_shipping := case when v_ship.free_over is not null and v_subtotal >= v_ship.free_over then 0 else v_ship.price end;

  insert into orders (status, payment_method, customer_name, customer_email, customer_phone, city,
                      delivery, address, note, shipping_method_id, shipping_name, shipping_price,
                      subtotal, total, invoice_requested, invoice_details, terms_accepted_at)
  values (case when p_payment_method = 'cod' then 'new'::order_status else 'pending_payment'::order_status end,
          p_payment_method,
          p_customer->>'name', p_customer->>'email', p_customer->>'phone', coalesce(p_customer->>'city', ''),
          v_ship.delivery, coalesce(p_customer->>'address', ''), coalesce(p_customer->>'note', ''),
          v_ship.id, v_ship.name, v_shipping, v_subtotal, v_subtotal + v_shipping,
          coalesce((p_customer->>'invoice_requested')::boolean, false),
          coalesce(p_customer->'invoice_details', '{}'::jsonb),
          now())
  returning * into v_order;

  insert into order_items (order_id, product_id, name, price, quantity)
    select v_order.id, p.id, p.name, p.price, i.qty
      from unnest(v_ids, v_qtys) as i(pid, qty) join products p on p.id = i.pid;

  if p_deduct then
    update products p set stock = p.stock - i.qty
      from unnest(v_ids, v_qtys) as i(pid, qty) where p.id = i.pid;
    update orders set stock_deducted = true where id = v_order.id returning * into v_order;
  end if;

  return v_order;
end $$;

-- Почистване на ненужни лични данни (GDPR, минимизиране). Вика се от дневния cron.
-- Изтриват се само неплатени/изоставени записи и логовете за вход; платените остават
-- заради счетоводните срокове.
create or replace function cleanup_stale_data(p_days integer default 30) returns jsonb
language plpgsql security definer set search_path = public as $$
declare b integer; o integer; l integer; e integer;
begin
  delete from bookings
   where status = 'expired' and not deposit_paid and created_at < now() - make_interval(days => p_days);
  get diagnostics b = row_count;
  delete from orders
   where status = 'expired' and paid_at is null and not stock_deducted
     and created_at < now() - make_interval(days => p_days);
  get diagnostics o = row_count;
  delete from admin_login_attempts where created_at < now() - make_interval(days => p_days);
  get diagnostics l = row_count;
  delete from stripe_events where created_at < now() - make_interval(days => 90);
  get diagnostics e = row_count;
  return jsonb_build_object('bookings', b, 'orders', o, 'login_attempts', l, 'stripe_events', e);
end $$;

-- Функциите са само за сървъра (service role)
revoke all on function order_deduct_stock(uuid) from public, anon, authenticated;
revoke all on function order_restore_stock(uuid) from public, anon, authenticated;
revoke all on function create_order(jsonb, jsonb, uuid, payment_method, boolean) from public, anon, authenticated;
revoke all on function expire_stale_bookings(integer) from public, anon, authenticated;
grant execute on function order_deduct_stock(uuid) to service_role;
grant execute on function order_restore_stock(uuid) to service_role;
grant execute on function create_order(jsonb, jsonb, uuid, payment_method, boolean) to service_role;
grant execute on function expire_stale_bookings(integer) to service_role;
revoke all on function cleanup_stale_data(integer) from public, anon, authenticated;
grant execute on function cleanup_stale_data(integer) to service_role;

-- ---------------------------------------------------------------------
-- RLS: публично четене само на активни/публични данни, без публични записи
-- ---------------------------------------------------------------------
alter table settings              enable row level security;
alter table business_hours        enable row level security;
alter table blocked_periods       enable row level security;
alter table services              enable row level security;
alter table bookings              enable row level security;
alter table booking_services      enable row level security;
alter table categories            enable row level security;
alter table products              enable row level security;
alter table shipping_methods      enable row level security;
alter table orders                enable row level security;
alter table order_items           enable row level security;
alter table stripe_events         enable row level security;
alter table admin_login_attempts  enable row level security;
alter table withdrawal_requests   enable row level security;

create policy "public read settings"          on settings         for select to anon, authenticated using (is_public);
create policy "public read business hours"    on business_hours   for select to anon, authenticated using (true);
create policy "public read services"          on services         for select to anon, authenticated using (is_active);
create policy "public read categories"        on categories       for select to anon, authenticated using (is_active);
create policy "public read products"          on products         for select to anon, authenticated using (is_active);
create policy "public read shipping methods"  on shipping_methods for select to anon, authenticated using (is_active);
-- Останалите таблици нямат политики → недостъпни без service role.

-- Изрични права (не разчитаме на подразбиращите се в проекта)
grant usage on schema public to anon, authenticated, service_role;
grant select on settings, business_hours, services, categories, products, shipping_methods to anon, authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- =====================================================================
-- SEED
-- =====================================================================

insert into settings (key, label, value) values
  ('business_name',   'Име на салона',                  '"Culte"'),
  ('slogan',          'Слоган',                         '"Професионализмът се крие в детайлите"'),
  ('address',         'Адрес',                          '"гр. Пловдив, ж.к. Оазис 3 / ул. Димитър Талев 144"'),
  ('phone',           'Телефон',                        '"0878 817 088"'),
  ('instagram_url',   'Instagram',                      '"https://www.instagram.com/groom.animalhouse/"'),
  ('facebook_url',    'Facebook',                       '"https://www.facebook.com/profile.php?id=61557470280771"'),
  ('tiktok_url',      'TikTok',                         '"https://www.tiktok.com/@animal.house.groom"'),
  ('map_url',         'Линк към картата',               '"https://www.google.com/maps/search/?api=1&query=Груминг+салон+Animal+House+Пловдив"'),
  ('team',            'Екип',                           '["Стефани"]'),
  ('cosmetics',       'Козметика в салона',             '["CULTE", "Artero", "Hydra"]'),
  ('deposit_percent', 'Капаро (%) — за услуги без зададено капаро',                     '50'),
  ('slot_step_min',   'Стъпка на часовете (мин)',       '60'),
  ('min_lead_hours',  'Минимум часове напред',          '2'),
  ('max_days_ahead',  'Максимум дни напред',            '60'),
  ('hold_minutes',    'Задържане на часа за плащане (мин)', '30'),
  -- Данни за търговеца (ЗЕТ чл. 4, ЗЗП чл. 47) — попълват се от админ панела
  ('company_name',    'Наименование на търговеца',      '"ЕВРО ССБ ЕООД"'),
  ('company_eik',     'ЕИК',                            '"207604304"'),
  ('company_vat',     'ДДС номер (ако има)',            '""'),
  ('company_address', 'Седалище и адрес на управление', '""'),
  ('company_email',   'Имейл за контакт',               '""'),
  ('vat_registered',  'Регистриран по ДДС',             'true');

insert into business_hours (weekday, is_closed, open_time, close_time) values
  (0, false, '10:00', '16:00'),
  (1, false, '09:00', '18:00'),
  (2, false, '09:00', '18:00'),
  (3, false, '09:00', '18:00'),
  (4, false, '09:00', '18:00'),
  (5, false, '09:00', '18:00'),
  (6, false, '10:00', '16:00');

-- Услуги — актуални данни от админ панела (2026-11-22).
-- Групи: breed = породен груминг, weight = цялостен груминг по килограми, extra = допълнителни услуги.
-- Размер: small = малки породи (под 5 кг), medium = средни породи (5–15 кг), large = големи породи (над 15 кг).
-- (размер, група, име, описание, включва, примерни породи, мин, макс, цена от, цена до, капаро, само допълнителна, може да се добави, активна, ред)
insert into services (size, group_name, name, description, includes, breeds, duration_min, duration_max, price_from, price_to, deposit, is_addon, addon_allowed, is_active, sort_order)
select v.size::dog_size, v.grp::service_group, v.name, v.description, v.includes, v.breeds, v.dmin, v.dmax, v.pfrom, v.pto, v.deposit, v.is_addon, v.addon_allowed, v.is_active, v.sort_order
from (values
  -- Породен груминг
  ('small', 'breed', 'Бишон Фризе', 'Подстригване по стандарт на породата или по желание на клиента.', 'Изрязване на нокти, старателно почистване на уши и очи, спа баня с подходяща козметика, подсушаване, разресване на козината и подстригване.', '', 120, 180, 58.00, 78.00, 30.00, false, false, true, 0),
  ('small', 'breed', 'Мини пудел', 'Подстригване по стандарта на породата или по ваше желание.', 'Изрязване на нокти, почистване на уши и очи, спа баня с подходяща козметика, подсушаване, разресване на козината и подстригване.', '', 150, 180, 68.00, 98.00, 30.00, false, false, true, 10),
  ('small', 'breed', 'Той пудел', 'Подстригване по стандарта на породата или по желание на клиента.', 'Рязане нокти, почистване и скубане уши, почистване на очи, спа баня с подходящи продукти, подсушаване, старателно разресване на козината и подстригване.', '', 90, 180, 58.00, 88.00, 30.00, false, false, true, 10),
  ('small', 'breed', 'Йоркширски териер', 'Подстригване по стандарта на породата или по ваше желание.', 'Изрязване на нокти, почистване на уши и очи, спа баня с подходяща козметика, подсушаване, разресване на козината и подстригване.', '', 90, 120, 58.00, 78.00, 30.00, false, false, true, 20),
  ('small', 'breed', 'Кавапу / Малтипу / Малтийска болонка', 'Подстригване по стандарта на породата или по желанието на клиента.', 'Изрязване на нокти, старателно почистване на уши и очи, спа баня с подходяща козметика, подсушаване, разресване на козината и подстригване.', '', 120, 150, 58.00, 88.00, 30.00, false, false, true, 30),
  ('small', 'breed', 'Пекинез / Ши-тцу', 'Подстригване по стандарта на породата или по ваше желание.', 'Изрязване на нокти, старателно почистване на уши и очи, спа баня с подходяща козметика, подсушаване, разресване на козината и подстригване.', '', 120, 150, 58.00, 88.00, 30.00, false, false, true, 30),
  ('small', 'breed', 'Померан / Шпиц', 'Подстригване по стандарта на породата или по желанието на клиента.', 'Изрязване на нокти, старателно почистване на уши и очи, спа баня с подходяща козметика, подсушаване, разресване на козината и подстригване.', '', 90, 180, 58.00, 98.00, 30.00, false, false, true, 40),
  ('medium', 'breed', 'Стандартен пудел', 'Подстригване по стандарта на породата или по ваше желание.', 'Рязане нокти, почистване и скубане уши, почистване на очи, спа баня с подходящи продукти, подсушаване, старателно разресване на козината и подстригване.', '', 180, 240, 88.00, 128.00, 50.00, false, false, true, 10),
  ('medium', 'breed', 'Среден пудел', 'Подстригване по стандарта на породата или по ваше желание.', 'Изрязване на нокти, старателно почистване на уши и очи, спа баня с подходяща козметика, подсушаване, разресване на козината и подстригване.', '', 180, 210, 78.00, 118.00, 40.00, false, false, true, 20),
  ('medium', 'breed', 'Шнауцер', 'Подстригване по стандарта на породата или по ваше желание, стрипинг.', 'Изрязване на нокти, старателно почистване на уши и очи, спа баня с подходяща козметика, подсушаване, разресване и подстригване/стрипинг.', '', 120, 150, 58.00, 98.00, 35.00, false, false, true, 40),
  ('medium', 'breed', 'Кавалер / Кокер шпаньол', 'Подстригване по стандарта на породата или по ваше желание.', 'Изрязване на нокти, старателно почистване на уши и очи, спа баня с подходяща козметика, подсушаване, разресване на козината и подстригване.', '', 150, 180, 58.00, 98.00, 30.00, false, false, true, 50),
  -- Цялостен груминг по килограми
  ('small', 'weight', 'Късокосмести породи/ пинчер, чихуахуа, френски булдог и др.', 'За всички късокосмести под 5 кг.', 'Рязане на нокти, чистене на уши и очи, спа баня с подходящи продукти, подсушаване, премахване на мъртвият косъм .', 'Френски булдог, чихуахуа, мини пинчер', 60, 90, 40.00, 68.00, 30.00, false, false, true, 100),
  ('medium', 'weight', 'Цялостен груминг за средни породи 5–15 кг', 'Цялостен груминг за породи от 5 до 15 кг. Подстригване по стандарт или по желание на клиента.', 'Изрязване на нокти, старателно почистване на уши и очи, спа баня с подходяща козметика, подсушаване, разресване и подстригване или изресване на мъртвата козина.', 'Джак ръсел, френски булдог, Бигъл, Шиба ину и др.', 120, 180, 58.00, 98.00, 30.00, false, false, true, 100),
  ('large', 'weight', 'Цялостен груминг за гигантски породи до 45кг', 'Груминг за гигантски породи до 45кг. Подстригване по стандарта на породата или по ваше желание.', 'Рязане нокти, почистване на уши, почистване на очи, спа баня с подходящи продукти, подсушаване, старателно разресване на козината и подстригване/изресване на мъртва козина.', 'Овчарски кучета, кане-корсо, Чау-чау и др.', 120, 240, 98.99, 199.99, 50.00, false, false, true, 0),
  ('large', 'weight', 'Цялостен груминг за големи породи 15–25 кг', 'Груминг за големи породи от 15 до 25 кг. Подстригване по стандарта на породата или по ваше желание.', 'Рязане нокти, почистване на уши, почистване на очи, спа баня с подходящи продукти, подсушаване, старателно разресване на козината и подстригване/изресване на мъртва козина.', 'Хъски, Акита, Самоед, Овчарски кучета и др.', 120, 240, 89.99, 189.99, 50.00, false, false, true, 100),
  -- Допълнителни услуги
  ('small', 'extra', 'Почистване на зъбен камък(БЕЗ УПОЙКА)', 'Почистване на зъбен камък без упойка и без болка. Здравите зъби означават щастливо кученце. 
Защо е важно редовното почистване на зъбен камък?
1. Поддържа зъбите и венците здрави
2. Намалява лошият дъх
3. Помага за предотвратяване на възпаления и проблеми в устната кухина.', 'Почистване с ултразвукова четка, без упойка и абсолютно никаква болка.', 'Всички породи', 60, 60, 58.00, 58.00, 30.00, false, true, true, 200),
  ('small', 'extra', 'Рязане на нокти', '', 'Скъсяване и оформяне на ноктите.', 'Кучета и котки', 10, 10, 10.00, 10.00, 5.00, true, true, true, 210),
  ('small', 'extra', 'Почистване на уши', 'Старателно почистване на уши с лосион, и оскубване с стрипинг пудра на косъмчетата в ушите (ако е необходимо според породата)', 'Почистване на ушите с подходящ лосион и оскубване на косъмчетата в ушите (ако е необходимо)', 'Кучета и котки', 10, 15, 10.00, 10.00, 5.00, true, true, true, 220),
  ('medium', 'extra', 'Почистване на зъбен камък(БЕЗ УПОЙКА)', 'Почистване на зъбен камък без упойка и без болка. Здравите зъби означават щастливо кученце. 
Защо е важно редовното почистване на зъбен камък?
1. Поддържа зъбите и венците здрави
2. Намалява лошият дъх
3. Помага за предотвратяване на възпаления и проблеми в устната кухина.', 'Почистване с ултразвукова четка, без упойка и абсолютно никаква болка.', 'Всички породи', 60, 60, 58.00, 58.00, 30.00, true, true, true, 200),
  ('medium', 'extra', 'Рязане на нокти', '', 'Скъсяване и оформяне на ноктите.', 'Кучета и котки', 10, 10, 10.00, 10.00, 5.00, true, true, true, 210),
  ('medium', 'extra', 'Почистване на уши', 'Старателно почистване на уши с лосион, и оскубване с стрипинг пудра на косъмчетата в ушите (ако е необходимо според породата)', 'Почистване на ушите с подходящ лосион и оскубване на косъмчетата в ушите (ако е необходимо)', 'Кучета и котки', 10, 15, 10.00, 10.00, 5.00, true, true, true, 220),
  ('large', 'extra', 'Почистване на зъбен камък(БЕЗ УПОЙКА)', 'Почистване на зъбен камък без упойка и без болка. Здравите зъби означават щастливо кученце. 
Защо е важно редовното почистване на зъбен камък?
1. Поддържа зъбите и венците здрави
2. Намалява лошият дъх
3. Помага за предотвратяване на възпаления и проблеми в устната кухина.', 'Почистване с ултразвукова четка, без упойка и абсолютно никаква болка.', 'всички', 60, 60, 58.00, 58.00, 30.00, true, true, true, 200),
  ('large', 'extra', 'Рязане на нокти', '', 'Скъсяване и оформяне на ноктите.', '', 10, 10, 10.00, 10.00, 5.00, true, false, true, 210),
  ('large', 'extra', 'Чистене на уши', '', 'Почистване на ушите с подходящ лосион.', '', 10, 10, 8.00, 8.00, 4.00, true, false, true, 220)
) as v(size, grp, name, description, includes, breeds, dmin, dmax, pfrom, pto, deposit, is_addon, addon_allowed, is_active, sort_order);

insert into categories (name, slug, description, sort_order) values
  ('Шампоани',         'shampoani',        'Нежно почистване, подбрано според типа козина.',          10),
  ('Балсами и маски',  'balsami-i-maski',  'Мекота, блясък и лесно разресване.',                      20),
  ('Парфюми',          'parfyumi',         'Лек, деликатен аромат след къпане.',                      30),
  ('Лапи, уши и очи',  'lapi-ushi-ochi',   'Ежедневна грижа за чувствителните места.',                40),
  ('Четки и гребени',  'chetki-i-grebeni', 'Инструменти, с които работим и в салона.',                50),
  ('Комплекти',        'komplekti',        'Подбрани комбинации за път и за подарък.',                60);

insert into products (category_id, name, slug, description, price, stock, is_active, sort_order)
select c.id, p.name, p.slug, p.description, p.price, p.stock, p.is_active, p.sort_order
from (values
  ('shampoani',        'Шампоан за чувствителна кожа „Овес и лайка“ 250 мл', 'shampoan-oves-i-laika',
   'Мек шампоан с екстракт от овес и лайка за кучета с чувствителна кожа. Пени се леко, отмива се лесно и оставя козината мека и чиста.', 14.90, 20, true, 10),
  ('shampoani',        'Шампоан за светла козина 250 мл',                     'shampoan-svetla-kozina',
   'Създаден за бяла и светла козина. Помага за по-свеж, изчистен цвят и естествен блясък без да изсушава.', 15.90, 12, true, 20),
  ('shampoani',        'Нежен шампоан за кученца 200 мл',                     'shampoan-kuchentsa',
   'Деликатна формула за първите къпания. Лек аромат и мека пяна, подходяща за малки и неспокойни кученца.', 12.90, 15, true, 30),
  ('balsami-i-maski',  'Балсам за лесно разресване 200 мл',                   'balsam-razresvane',
   'Изглажда косъма и намалява заплитането след къпане. Четката минава по-леко, а козината остава мека.', 13.90, 18, true, 40),
  ('balsami-i-maski',  'Подхранваща маска за суха козина 200 мл',             'maska-suha-kozina',
   'Богата маска за суха и изтощена козина. Нанесете след шампоан, оставете за няколко минути и изплакнете.', 17.90, 8, true, 50),
  ('balsami-i-maski',  'Спрей против сплъстяване 150 мл',                     'sprei-protiv-splastyavane',
   'Лек спрей без изплакване, който помага при разплитане на възли между къпанията.', 11.90, 25, true, 60),
  ('parfyumi',         'Парфюм „Ванилия и сандал“ 50 мл',                     'parfyum-vaniliya-sandal',
   'Топъл, мек аромат с нотки на ванилия и сандалово дърво. Няколко пръскания върху козината са достатъчни.', 16.90, 10, true, 70),
  ('parfyumi',         'Парфюм „Свеж памук“ 50 мл',                           'parfyum-svezh-pamuk',
   'Чист и лек аромат на прясно изпрано бельо. Подходящ за след къпане или между две посещения в салона.', 16.90, 3, true, 80),
  ('lapi-ushi-ochi',   'Балсам за лапи и муцуна 50 мл',                       'balsam-lapi-mutsuna',
   'Плътен балсам с натурални масла за грапави възглавнички и суха муцуна. Попива бързо.', 9.90, 30, true, 90),
  ('lapi-ushi-ochi',   'Почистващ лосион за уши 100 мл',                      'losion-ushi',
   'Нежен лосион за редовно почистване на външната част на ухото. Използвайте с памучен тампон.', 10.90, 14, true, 100),
  ('lapi-ushi-ochi',   'Почистващи кърпички за очи, 50 бр.',                  'karpichki-ochi',
   'Овлажнени кърпички за ежедневно почистване около очите. Удобни у дома и на път.', 7.90, 40, true, 110),
  ('chetki-i-grebeni', 'Четка с естествен косъм',                             'chetka-estestven-kosam',
   'Разпределя естествените масла по козината и придава блясък. Подходяща за къса и средна козина.', 19.90, 6, true, 120),
  ('chetki-i-grebeni', 'Метален гребен с въртящи се зъбци',                   'metalen-greben',
   'Въртящите се зъбци разплитат по-нежно и не дърпат косъма. Подходящ за довършване след четка.', 12.90, 0, true, 130),
  ('komplekti',        'Комплект за пътуване, 3 мини продукта',               'komplekt-patuvane',
   'Мини шампоан, балсам и парфюм в удобна чантичка за път.', 24.90, 5, false, 140)
) as p(cat, name, slug, description, price, stock, is_active, sort_order)
join categories c on c.slug = p.cat;

-- Информация за безопасност (GPSR). Производител по подразбиране = търговецът от настройките.
update products set safety_info =
  'Само за външна употреба при кучета. Да се избягва контакт с очите; при контакт изплакнете обилно с вода. При раздразнение спрете употребата. Да се съхранява на място, недостъпно за деца, при стайна температура.'
 where slug <> 'chetka-estestven-kosam' and slug <> 'metalen-greben';
update products set safety_info =
  'Използвайте внимателно, без натиск върху кожата. Не оставяйте кучето без надзор с инструмента. Да се съхранява на място, недостъпно за деца.'
 where slug in ('chetka-estestven-kosam', 'metalen-greben');

insert into shipping_methods (name, description, provider, delivery, price, free_over, sort_order) values
  ('Доставка до адрес',  'Куриер до посочен адрес, 1–3 работни дни.', 'manual', 'address', 6.90, 60.00, 10),
  ('Доставка до офис',   'Вземане от офис на куриер, 1–3 работни дни.', 'manual', 'office', 4.90, 60.00, 20),
  ('Вземане от салона',  'Вземете поръчката си от салона в Пловдив.',   'manual', 'pickup', 0.00, null, 30);

-- =====================================================================
-- Доставка: Speedy и BoxNow (= миграция 003)
-- =====================================================================
-- @@SHIPPING_V3_BEGIN
alter table orders
  add column if not exists shipping_provider      text not null default 'manual',   -- manual | speedy | boxnow
  add column if not exists shipping_method        text not null default '',         -- speedy_office | speedy_apt | speedy_address | boxnow | pickup
  add column if not exists shipping_site_id       bigint,                           -- Speedy населено място
  add column if not exists shipping_site_name     text not null default '',
  add column if not exists shipping_office_id     bigint,                           -- Speedy офис/автомат
  add column if not exists shipping_office_name   text not null default '',
  add column if not exists shipping_deadline      timestamptz,
  add column if not exists shipping_details       jsonb not null default '{}'::jsonb,
  add column if not exists speedy_shipment_id     text,
  add column if not exists speedy_parcel_id       text,
  add column if not exists speedy_created_at      timestamptz,
  add column if not exists speedy_last_synced_at  timestamptz,
  add column if not exists boxnow_locker_id       text,
  add column if not exists boxnow_locker_name     text not null default '',
  add column if not exists boxnow_delivery_id     text,
  add column if not exists boxnow_parcel_id       text,
  add column if not exists boxnow_created_at      timestamptz;

create index if not exists orders_speedy_sync_idx on orders (speedy_last_synced_at nulls first)
  where speedy_parcel_id is not null;

-- create_order: цената на доставката идва от сървъра (преизчислена от Speedy/BoxNow),
-- никога от клиента. p_shipping е jsonb с provider, method, price, name, delivery, IDs.
drop function if exists create_order(jsonb, jsonb, uuid, payment_method, boolean);

create or replace function create_order(
  p_customer        jsonb,
  p_items           jsonb,
  p_shipping        jsonb,
  p_payment_method  payment_method,
  p_deduct          boolean
) returns orders
language plpgsql security definer set search_path = public as $$
declare
  v_order     orders%rowtype;
  v_ids       uuid[];
  v_qtys      integer[];
  v_subtotal  numeric(10,2);
  v_shipping  numeric(10,2);
  v_bad       integer;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_cart';
  end if;
  v_shipping := (p_shipping->>'price')::numeric(10,2);
  if v_shipping is null or v_shipping < 0 then raise exception 'invalid_shipping'; end if;

  select array_agg(pid order by pid), array_agg(qty order by pid)
    into v_ids, v_qtys
    from (select (e->>'product_id')::uuid as pid, sum((e->>'quantity')::int)::int as qty
            from jsonb_array_elements(p_items) e group by 1) x;

  if exists (select 1 from unnest(v_qtys) q where q <= 0 or q > 999) then
    raise exception 'invalid_quantity';
  end if;

  perform 1 from products where id = any(v_ids) order by id for update;

  select count(*) into v_bad
    from unnest(v_ids, v_qtys) as i(pid, qty)
    left join products p on p.id = i.pid and p.is_active
   where p.id is null or p.stock < i.qty;
  if v_bad > 0 then raise exception 'insufficient_stock'; end if;

  select coalesce(sum(p.price * i.qty), 0) into v_subtotal
    from unnest(v_ids, v_qtys) as i(pid, qty) join products p on p.id = i.pid;

  insert into orders (status, payment_method, customer_name, customer_email, customer_phone, city,
                      delivery, address, note, shipping_method_id, shipping_name, shipping_price,
                      subtotal, total, invoice_requested, invoice_details, terms_accepted_at,
                      shipping_provider, shipping_method, shipping_site_id, shipping_site_name,
                      shipping_office_id, shipping_office_name, shipping_deadline, shipping_details,
                      boxnow_locker_id, boxnow_locker_name)
  values (case when p_payment_method = 'cod' then 'new'::order_status else 'pending_payment'::order_status end,
          p_payment_method,
          p_customer->>'name', p_customer->>'email', p_customer->>'phone', coalesce(p_customer->>'city', ''),
          coalesce(p_shipping->>'delivery', 'address')::delivery_type,
          coalesce(p_customer->>'address', ''), coalesce(p_customer->>'note', ''),
          nullif(p_shipping->>'method_id', '')::uuid,
          coalesce(p_shipping->>'name', ''), v_shipping, v_subtotal, v_subtotal + v_shipping,
          coalesce((p_customer->>'invoice_requested')::boolean, false),
          coalesce(p_customer->'invoice_details', '{}'::jsonb),
          now(),
          coalesce(p_shipping->>'provider', 'manual'), coalesce(p_shipping->>'method', ''),
          nullif(p_shipping->>'site_id', '')::bigint, coalesce(p_shipping->>'site_name', ''),
          nullif(p_shipping->>'office_id', '')::bigint, coalesce(p_shipping->>'office_name', ''),
          nullif(p_shipping->>'deadline', '')::timestamptz,
          coalesce(p_shipping->'details', '{}'::jsonb),
          nullif(p_shipping->>'boxnow_locker_id', ''), coalesce(p_shipping->>'boxnow_locker_name', ''))
  returning * into v_order;

  insert into order_items (order_id, product_id, name, price, quantity)
    select v_order.id, p.id, p.name, p.price, i.qty
      from unnest(v_ids, v_qtys) as i(pid, qty) join products p on p.id = i.pid;

  if p_deduct then
    update products p set stock = p.stock - i.qty
      from unnest(v_ids, v_qtys) as i(pid, qty) where p.id = i.pid;
    update orders set stock_deducted = true where id = v_order.id returning * into v_order;
  end if;

  return v_order;
end $$;

revoke all on function create_order(jsonb, jsonb, jsonb, payment_method, boolean) from public, anon, authenticated;
grant execute on function create_order(jsonb, jsonb, jsonb, payment_method, boolean) to service_role;

-- Доставка до адрес/офис вече е през Speedy; ръчните методи остават само за вземане от салона
update shipping_methods set is_active = false where provider = 'manual' and delivery in ('address', 'office');
-- @@SHIPPING_V3_END

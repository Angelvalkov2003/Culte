-- =====================================================================
-- Culte — пълна схема на базата (Supabase / Postgres)
-- Изпълнява се НАВЕДНЪЖ в SQL Editor на празен проект.
-- Всички записи минават през сървъра със service role ключа.
-- =====================================================================

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
create type delivery_type as enum ('address', 'office', 'pickup');

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
  status                    booking_status not null default 'pending_payment',
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
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create index orders_status_idx on orders (status, created_at desc);
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
  v_subtotal  numeric(10,2);
  v_shipping  numeric(10,2);
  v_bad       integer;
begin
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'empty_cart';
  end if;

  select * into v_ship from shipping_methods where id = p_shipping_method_id and is_active;
  if not found then raise exception 'invalid_shipping'; end if;

  create temp table _items on commit drop as
    select (e->>'product_id')::uuid as product_id, sum((e->>'quantity')::int) as qty
      from jsonb_array_elements(p_items) e
     group by 1;

  if exists (select 1 from _items where qty <= 0) then raise exception 'invalid_quantity'; end if;

  perform 1 from products where id in (select product_id from _items) order by id for update;

  select count(*) into v_bad from _items i
    left join products p on p.id = i.product_id and p.is_active
   where p.id is null or p.stock < i.qty;
  if v_bad > 0 then raise exception 'insufficient_stock'; end if;

  select coalesce(sum(p.price * i.qty), 0) into v_subtotal
    from _items i join products p on p.id = i.product_id;

  v_shipping := case when v_ship.free_over is not null and v_subtotal >= v_ship.free_over then 0 else v_ship.price end;

  insert into orders (status, payment_method, customer_name, customer_email, customer_phone, city,
                      delivery, address, note, shipping_method_id, shipping_name, shipping_price,
                      subtotal, total)
  values (case when p_payment_method = 'cod' then 'new'::order_status else 'pending_payment'::order_status end,
          p_payment_method,
          p_customer->>'name', p_customer->>'email', p_customer->>'phone', p_customer->>'city',
          v_ship.delivery, coalesce(p_customer->>'address', ''), coalesce(p_customer->>'note', ''),
          v_ship.id, v_ship.name, v_shipping, v_subtotal, v_subtotal + v_shipping)
  returning * into v_order;

  insert into order_items (order_id, product_id, name, price, quantity)
    select v_order.id, p.id, p.name, p.price, i.qty
      from _items i join products p on p.id = i.product_id;

  if p_deduct then
    update products p set stock = p.stock - i.qty from _items i where p.id = i.product_id;
    update orders set stock_deducted = true where id = v_order.id returning * into v_order;
  end if;

  return v_order;
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

create policy "public read settings"          on settings         for select to anon, authenticated using (is_public);
create policy "public read business hours"    on business_hours   for select to anon, authenticated using (true);
create policy "public read services"          on services         for select to anon, authenticated using (is_active);
create policy "public read categories"        on categories       for select to anon, authenticated using (is_active);
create policy "public read products"          on products         for select to anon, authenticated using (is_active);
create policy "public read shipping methods"  on shipping_methods for select to anon, authenticated using (is_active);
-- Останалите таблици нямат политики → недостъпни без service role.

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
  ('team',            'Екип',                           '["Цветелина", "Стефани"]'),
  ('cosmetics',       'Козметика в салона',             '["Artero", "Hydra"]'),
  ('deposit_percent', 'Капаро (%)',                     '50'),
  ('slot_step_min',   'Стъпка на часовете (мин)',       '30'),
  ('min_lead_hours',  'Минимум часове напред',          '2'),
  ('max_days_ahead',  'Максимум дни напред',            '60'),
  ('hold_minutes',    'Задържане на часа за плащане (мин)', '30');

insert into business_hours (weekday, is_closed, open_time, close_time) values
  (0, false, '10:00', '16:00'),
  (1, false, '09:00', '18:00'),
  (2, false, '09:00', '18:00'),
  (3, false, '09:00', '18:00'),
  (4, false, '09:00', '18:00'),
  (5, false, '09:00', '18:00'),
  (6, false, '10:00', '16:00');

-- Услуги: (размер, име, описание, мин, макс, цена от, цена до, допълнителна, ред)
insert into services (size, name, description, duration_min, duration_max, price_from, price_to, is_addon, sort_order) values
  -- Малки породи
  ('small', 'Цялостен груминг',                 'Къпане, сушене, подстригване, нокти, уши и очи в една среща.', 180, 180, 38.35, 61.36, false, 10),
  ('small', 'Подстригване и миене',             'Измиване с подходяща козметика и подстригване по желание.',     120, 120, 30.68, 46.02, false, 20),
  ('small', 'Подстригване',                     'Оформяне на козината според породата и вашите предпочитания.',   120, 120, 30.68, 46.02, false, 30),
  ('small', 'Къпане и сушене',                  'Нежно къпане, балсам и внимателно сушене.',                      120, 120, 30.68, 46.02, false, 40),
  ('small', 'Разресване',                       'Разплитане и премахване на подкосъма.',                           60,  60, 23.01, 23.01, false, 50),
  ('small', 'Премахване на зъбна плака',        'Безболезнено почистване на плаката от зъбите.',                   60,  60, 46.02, 46.02, false, 60),
  ('small', 'Зъбна хигиена',                    'Почистване и грижа за свеж дъх.',                                 60,  60, 46.02, 46.02, false, 70),
  ('small', 'Консултация',                      'Разговор за козината, кожата и домашната грижа.',                 30,  30, 25.56, 25.56, false, 80),
  ('small', 'Курс по грижа за куче',            'Показваме ви как да поддържате козината у дома.',                 30,  30, 25.56, 25.56, false, 90),
  ('small', 'Подстригване и почистване на уши', 'Подстригване на космите и почистване на ушите.',                  15,  15, 10.23, 10.23, true, 100),
  ('small', 'Почистване и грижа за очи',        'Внимателно почистване около очите.',                              10,  10,  5.11,  5.11, true, 110),
  ('small', 'Изрязване на нокти',               'Скъсяване и оформяне на ноктите.',                                10,  10,  5.11,  5.11, true, 120),
  -- Средни породи
  ('medium', 'Цялостен груминг',                 'Къпане, сушене, подстригване, нокти, уши и очи в една среща.',  90, 180, 40.90, 92.03, false, 10),
  ('medium', 'Подстригване и миене',             'Измиване с подходяща козметика и подстригване по желание.',      90, 180, 38.35, 76.69, false, 20),
  ('medium', 'Подстригване',                     'Оформяне на козината според породата и вашите предпочитания.',   90, 180, 30.68, 61.36, false, 30),
  ('medium', 'Къпане и сушене',                  'Нежно къпане, балсам и внимателно сушене.',                      60, 120, 30.68, 61.36, false, 40),
  ('medium', 'Спа баня',                         'Подхранваща баня с маска за мека и блестяща козина.',            60,  90, 25.56, 40.90, false, 50),
  ('medium', 'Разресване',                       'Разплитане и премахване на подкосъма.',                          60,  60, 23.01, 23.01, false, 60),
  ('medium', 'Премахване на зъбна плака',        'Безболезнено почистване на плаката от зъбите.',                  60,  60, 46.02, 46.02, false, 70),
  ('medium', 'Зъбна хигиена',                    'Почистване и грижа за свеж дъх.',                                60,  60, 46.02, 46.02, false, 80),
  ('medium', 'Курс по грижа за куче',            'Показваме ви как да поддържате козината у дома.',               120, 120, 51.13, 51.13, false, 90),
  ('medium', 'Консултация',                      'Разговор за козината, кожата и домашната грижа.',                10,  10, 10.23, 10.23, false, 100),
  ('medium', 'Подстригване и почистване на уши', 'Подстригване на космите и почистване на ушите.',                 20,  20,  5.11, 10.23, true, 110),
  ('medium', 'Почистване и грижа за очи',        'Внимателно почистване около очите.',                             10,  10,  5.11,  5.11, true, 120),
  ('medium', 'Изрязване на нокти',               'Скъсяване и оформяне на ноктите.',                               10,  10,  5.11,  5.11, true, 130),
  -- Големи породи
  ('large', 'Цялостен груминг',                 'Къпане, сушене, подстригване, нокти, уши и очи в една среща.',  120, 240,  92.03, 163.61, false, 10),
  ('large', 'Подстригване и миене',             'Измиване с подходяща козметика и подстригване по желание.',      90, 180,  51.13, 122.71, false, 20),
  ('large', 'Подстригване',                     'Оформяне на козината според породата и вашите предпочитания.',   60,  60,  51.13,  76.69, false, 30),
  ('large', 'Къпане и сушене',                  'Нежно къпане, балсам и внимателно сушене.',                      90, 240,  92.03, 148.27, false, 40),
  ('large', 'Специална баня',                   'Дълбоко почистваща баня за гъста и дълга козина.',               90, 180,  76.69, 127.82, false, 50),
  ('large', 'Разресване',                       'Разплитане и премахване на подкосъма.',                          60,  60,  23.01,  23.01, false, 60),
  ('large', 'Премахване на зъбна плака',        'Безболезнено почистване на плаката от зъбите.',                  60,  60,  46.02,  46.02, false, 70),
  ('large', 'Зъбна хигиена',                    'Почистване и грижа за свеж дъх.',                                60,  60,  46.02,  46.02, false, 80),
  ('large', 'Консултация',                      'Разговор за козината, кожата и домашната грижа.',                90,  90,  76.69,  76.69, false, 90),
  ('large', 'Курс по грижа за куче',            'Показваме ви как да поддържате козината у дома.',                30,  30,  25.56,  25.56, false, 100),
  ('large', 'Подстригване и почистване на уши', 'Подстригване на космите и почистване на ушите.',                 10,  10,  10.23,  10.23, true, 110),
  ('large', 'Почистване и грижа за очи',        'Внимателно почистване около очите.',                             10,  10,   5.11,   5.11, true, 120),
  ('large', 'Изрязване на нокти',               'Скъсяване и оформяне на ноктите.',                               10,  10,   5.11,   5.11, true, 130);

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

insert into shipping_methods (name, description, provider, delivery, price, free_over, sort_order) values
  ('Доставка до адрес',  'Куриер до посочен адрес, 1–3 работни дни.', 'manual', 'address', 6.90, 60.00, 10),
  ('Доставка до офис',   'Вземане от офис на куриер, 1–3 работни дни.', 'manual', 'office', 4.90, 60.00, 20),
  ('Вземане от салона',  'Вземете поръчката си от салона в Пловдив.',   'manual', 'pickup', 0.00, null, 30);

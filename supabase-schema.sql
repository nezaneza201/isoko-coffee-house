create extension if not exists pgcrypto;

create table if not exists public.site_settings(
  id integer primary key default 1,
  phone text not null default '+250 780 711 135',
  hours text not null default '05:30–00:00 daily',
  address text not null default 'Camp Muhoza, NM 63 St, Musanze',
  instagram text not null default 'https://www.instagram.com/isokocoffeehouse/',
  updated_at timestamptz default now()
);
insert into public.site_settings(id) values(1) on conflict(id) do nothing;

create table if not exists public.menu_items(
  id uuid primary key default gen_random_uuid(),
  category text not null,
  name text not null,
  price_rwf integer not null check(price_rwf >= 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.gallery(
  id uuid primary key default gen_random_uuid(),
  storage_path text unique not null,
  public_url text not null,
  caption text default 'Isoko Coffee House',
  created_at timestamptz default now()
);

alter table public.site_settings enable row level security;
alter table public.menu_items enable row level security;
alter table public.gallery enable row level security;

drop policy if exists "public read settings" on public.site_settings;
drop policy if exists "public read menu" on public.menu_items;
drop policy if exists "public read gallery" on public.gallery;
drop policy if exists "signed in manage settings" on public.site_settings;
drop policy if exists "signed in manage menu" on public.menu_items;
drop policy if exists "signed in manage gallery" on public.gallery;

create policy "public read settings" on public.site_settings for select using (true);
create policy "public read menu" on public.menu_items for select using (true);
create policy "public read gallery" on public.gallery for select using (true);

create policy "signed in manage settings" on public.site_settings for all to authenticated using (true) with check (true);
create policy "signed in manage menu" on public.menu_items for all to authenticated using (true) with check (true);
create policy "signed in manage gallery" on public.gallery for all to authenticated using (true) with check (true);

insert into storage.buckets(id,name,public)
values('isoko-gallery','isoko-gallery',true)
on conflict(id) do update set public=true;

drop policy if exists "public view isoko photos" on storage.objects;
drop policy if exists "signed in upload isoko photos" on storage.objects;
drop policy if exists "signed in update isoko photos" on storage.objects;
drop policy if exists "signed in delete isoko photos" on storage.objects;

create policy "public view isoko photos" on storage.objects for select using(bucket_id='isoko-gallery');
create policy "signed in upload isoko photos" on storage.objects for insert to authenticated with check(bucket_id='isoko-gallery');
create policy "signed in update isoko photos" on storage.objects for update to authenticated using(bucket_id='isoko-gallery') with check(bucket_id='isoko-gallery');
create policy "signed in delete isoko photos" on storage.objects for delete to authenticated using(bucket_id='isoko-gallery');

insert into public.menu_items(category,name,price_rwf) values
('Breakfast','Sausage Omelette',5000),('Breakfast','Spanish Omelette',3000),('Breakfast','Special Omelette',5000),('Breakfast','Rolex Plain',3500),('Breakfast','Rolex Chips',6000),('Breakfast','Beef Boilo',5000),('Breakfast','Chicken Boilo',5000),
('Salads','Fruit Salad',5000),('Salads','Volcano Garden Salad',5000),('Salads','Isoko Fruits Plata',6000),('Salads','Gucambale',4000),
('Lunch & Dinner','Chips Plata',3000),('Lunch & Dinner','Chicken Wings',6000),('Lunch & Dinner','Chicken or Beef Wrap',6000),('Lunch & Dinner','Chicken or Beef Sandwich',7000),('Lunch & Dinner','Chicken or Beef Stew',7000),('Lunch & Dinner','Chicken or Beef Stroganoff',7000),('Lunch & Dinner','Chicken or Beef Pillau',6000),('Lunch & Dinner','Isoko Spaghetti',6000),
('Meat','Fried 1/4 Chicken',7000),('Meat','Fried 1/2 Chicken',11000),('Meat','Whole Chicken',20000),('Meat','Family Chicken Rice',25000),('Meat','Roasted Tilapia',15000),('Meat','Chicken Brochette',7000),
('Hot Dishes','Fried Chicken Leg',5500),('Hot Dishes','Half Chicken',10000),('Hot Dishes','Whole Chicken',20000),('Hot Dishes','Family Chicken Rice',25000),('Hot Dishes','Roasted Tilapia',15000),('Hot Dishes','Beef Stew',5000),
('Fast Food','Beef Burger',5000),('Fast Food','Chicken Burger',6000),('Fast Food','Ham, Cheese Burger',4000),('Fast Food','Chicken Avo Sandwich',5000),('Fast Food','Club Sandwich',4000),('Fast Food','Veggie Wrap',4000),('Fast Food','Beef or Chicken Wrap',4500),
('Coffee','Espresso',1500),('Coffee','Macchiato',2000),('Coffee','Americano',2000),('Coffee','Black Coffee',2000),('Coffee','French Press',3000),('Coffee','Cappuccino',2000),('Coffee','Café Latte',2000),('Coffee','Cortado',2000),('Coffee','African Coffee',2500),('Coffee','Hot Chocolate',2000),
('Tea','African Tea',2000),('Tea','Black Tea',2000),('Tea','Green Tea',2000),('Tea','Umwoya Tea',2000),('Tea','Meant Tea',2000),('Tea','Lemon Tea',2000),('Tea','Spiced Tea',2500),
('Juices','Mango',3000),('Juices','Pineapple',3000),('Juices','Passion',3500),('Juices','Mango Banana',4000),('Juices','Mango Pineapple',4000),('Juices','Creamed Banana',3000),
('Milkshakes','Chocolate',4000),('Milkshakes','Vanilla',4000),('Milkshakes','Mango',4000),('Milkshakes','Caramel',4000),
('Iced','Iced Coffee',2500),('Iced','Iced Tea',2500),
('Quick Breakfast','Plain Omelet',1500),('Quick Breakfast','Spanish Omelet',2000),('Quick Breakfast','Special Omelet',4000),('Quick Breakfast','Rolex',2000),('Quick Breakfast','Local Agatogo',4000),('Quick Breakfast','Beef Boilo',4000),('Quick Breakfast','Chicken Boilo',5000)
on conflict do nothing;
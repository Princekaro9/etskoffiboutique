create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'client' check (role in ('client', 'super_admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  brand text not null check (char_length(trim(brand)) between 1 and 60),
  model text not null check (char_length(trim(model)) between 1 and 90),
  name text not null,
  price integer not null check (price > 0),
  promo_price integer check (promo_price is null or (promo_price > 0 and promo_price < price)),
  stock integer not null default 0 check (stock >= 0),
  image_url text,
  description text not null default '',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_published_created_idx on public.products (is_published, created_at desc);
create index if not exists products_brand_idx on public.products (lower(brand));

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin'
  );
$$;

revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to anon, authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();

create or replace function public.create_client_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role) values (new.id, 'client')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users
for each row execute function public.create_client_profile();

alter table public.profiles enable row level security;
alter table public.products enable row level security;
grant select on public.profiles to authenticated;
grant select on public.products to anon, authenticated;
grant insert, update on public.products to authenticated;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles
for select to authenticated using (id = auth.uid());

drop policy if exists "Published products are public" on public.products;
create policy "Published products are public" on public.products
for select to anon, authenticated using (is_published or public.is_super_admin());

drop policy if exists "Super admins insert products" on public.products;
create policy "Super admins insert products" on public.products
for insert to authenticated with check (public.is_super_admin());

drop policy if exists "Super admins update products" on public.products;
create policy "Super admins update products" on public.products
for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Product photos are public" on storage.objects;

drop policy if exists "Super admins upload product photos" on storage.objects;
create policy "Super admins upload product photos" on storage.objects
for insert to authenticated with check (bucket_id = 'product-images' and public.is_super_admin());

drop policy if exists "Super admins update product photos" on storage.objects;
create policy "Super admins update product photos" on storage.objects
for update to authenticated using (bucket_id = 'product-images' and public.is_super_admin())
with check (bucket_id = 'product-images' and public.is_super_admin());

drop policy if exists "Super admins delete product photos" on storage.objects;
create policy "Super admins delete product photos" on storage.objects
for delete to authenticated using (bucket_id = 'product-images' and public.is_super_admin());

-- AGAD: pages table + storage bucket

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  prompt text,
  html_path text not null,
  screenshot_path text,
  html_url text not null,
  screenshot_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pages_user_id_created_at_idx
  on public.pages (user_id, created_at desc);

create index if not exists pages_created_at_idx
  on public.pages (created_at desc);

alter table public.pages enable row level security;

drop policy if exists "pages_owner_select" on public.pages;
create policy "pages_owner_select"
  on public.pages for select
  using (auth.uid() = user_id);

drop policy if exists "pages_owner_insert" on public.pages;
create policy "pages_owner_insert"
  on public.pages for insert
  with check (auth.uid() = user_id);

drop policy if exists "pages_owner_update" on public.pages;
create policy "pages_owner_update"
  on public.pages for update
  using (auth.uid() = user_id);

drop policy if exists "pages_owner_delete" on public.pages;
create policy "pages_owner_delete"
  on public.pages for delete
  using (auth.uid() = user_id);

drop policy if exists "pages_public_read" on public.pages;
create policy "pages_public_read"
  on public.pages for select
  using (true);

insert into storage.buckets (id, name, public)
values ('pages', 'pages', true)
on conflict (id) do nothing;

drop policy if exists "pages_storage_owner_write" on storage.objects;
create policy "pages_storage_owner_write"
  on storage.objects for insert
  with check (
    bucket_id = 'pages'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "pages_storage_public_read" on storage.objects;
create policy "pages_storage_public_read"
  on storage.objects for select
  using (bucket_id = 'pages');
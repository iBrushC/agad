-- AGAD: example imagery bucket + multimodal embedding index
-- Applied: 2026-07-24 (project: agad / atannmtthcmcbstvzbqc)

create extension if not exists vector with schema extensions;

create table if not exists public.example_chunks (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  domain text not null,
  form_factor text not null check (form_factor in ('desktop','mobile')),
  chunk_order integer not null,
  file text not null,
  width integer not null,
  height integer not null,
  src_y_start integer not null,
  src_y_end integer not null,
  storage_path text not null,
  public_url text not null,
  embedding extensions.vector(768) not null,
  created_at timestamptz not null default now(),
  unique (source, form_factor, chunk_order)
);

create index if not exists example_chunks_embedding_ivfflat_idx
  on public.example_chunks using ivfflat (embedding extensions.vector_cosine_ops) with (lists = 100);

create index if not exists example_chunks_domain_idx
  on public.example_chunks (domain);

alter table public.example_chunks enable row level security;

drop policy if exists "example_chunks_public_read" on public.example_chunks;
create policy "example_chunks_public_read"
  on public.example_chunks for select
  using (true);

insert into storage.buckets (id, name, public)
values ('example_imagery', 'example_imagery', true)
on conflict (id) do nothing;

drop policy if exists "example_imagery_storage_public_read" on storage.objects;
create policy "example_imagery_storage_public_read"
  on storage.objects for select
  using (bucket_id = 'example_imagery');

drop policy if exists "example_imagery_storage_public_write" on storage.objects;
create policy "example_imagery_storage_public_write"
  on storage.objects for insert
  with check (bucket_id = 'example_imagery');

create or replace function public.match_example_chunks(
  query_embedding extensions.vector(768),
  match_count integer default 10
)
returns table (
  id uuid,
  source text,
  domain text,
  form_factor text,
  chunk_order integer,
  file text,
  public_url text,
  similarity double precision
)
language sql
stable
as $$
  select
    ec.id,
    ec.source,
    ec.domain,
    ec.form_factor,
    ec.chunk_order,
    ec.file,
    ec.public_url,
    1 - (ec.embedding <=> query_embedding) as similarity
  from public.example_chunks ec
  order by ec.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

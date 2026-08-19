-- Public marketing blog posts (SEO content center)
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  h1 text not null,
  excerpt text not null,
  meta_title text not null,
  meta_description text not null,
  content_md text not null,
  keywords text[] not null default '{}'::text[],
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_published boolean not null default true
);

create index if not exists blog_posts_published_at_idx
  on public.blog_posts (published_at desc)
  where is_published = true;

alter table public.blog_posts enable row level security;

drop policy if exists "Anyone can read published blog posts" on public.blog_posts;
create policy "Anyone can read published blog posts"
  on public.blog_posts
  for select
  to anon, authenticated
  using (is_published = true);

comment on table public.blog_posts is 'Public SEO blog posts for marketing site';

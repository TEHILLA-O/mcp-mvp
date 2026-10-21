-- MCP - MVP statistical warehouse.
-- Apply in the Supabase SQL editor or with psql "$DATABASE_URL" -f db/migrations/001_schema.sql

create table if not exists sources (
  id text primary key,
  publisher text not null,
  name text not null,
  url text not null,
  notes text not null default ''
);

create table if not exists datasets (
  id text primary key,
  source_id text not null references sources (id),
  name text not null,
  description text not null,
  category text not null,
  geography text not null,
  frequency text not null,
  period_start text not null,
  period_end text not null,
  source_url text not null,
  publication_title text not null,
  publication_date date,
  methodology text not null,
  limitations text not null
);

create table if not exists indicators (
  id text primary key,
  dataset_id text not null references datasets (id),
  name text not null,
  unit text not null,
  unit_kind text not null,
  frequency text not null,
  geography_level text not null,
  comparable_group text not null,
  revision_id text not null,
  methodology text not null
);

create table if not exists geographies (
  id text primary key,
  name text not null,
  level text not null,
  parent_id text references geographies (id),
  shape_name text
);

create table if not exists revisions (
  id text primary key,
  dataset_id text not null references datasets (id),
  label text not null,
  retrieved_at timestamptz not null,
  notes text not null default ''
);

create table if not exists observations (
  id text primary key,
  indicator_id text not null references indicators (id),
  value double precision,
  unit text not null,
  period text not null,
  frequency text not null,
  geography_id text not null references geographies (id),
  dataset_id text not null references datasets (id),
  source_url text not null,
  publication_title text not null,
  publication_date date,
  retrieved_at timestamptz not null,
  revision_id text not null references revisions (id),
  methodology text not null
);

create unique index if not exists observations_identity
  on observations (indicator_id, period, geography_id, revision_id);

create index if not exists observations_lookup
  on observations (indicator_id, geography_id, period);

create table if not exists ingestion_history (
  id text primary key,
  started_at timestamptz not null,
  finished_at timestamptz not null,
  status text not null,
  observation_count integer not null,
  warnings jsonb not null default '[]'::jsonb,
  notes text not null default ''
);

-- Runtime reads this document when DATABASE_URL is set.
-- The normalized tables above are the durable relational model for SQL access.
create table if not exists gazette_snapshot (
  id text primary key,
  document jsonb not null,
  updated_at timestamptz not null default now()
);

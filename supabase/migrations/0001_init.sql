-- UCOrm MVP 0 — initial schema
-- Run this in Supabase SQL Editor (Project → SQL Editor → New query → paste → Run)
-- Idempotent: dùng "if not exists" để re-run an toàn trong dev.

-- ============================================================
-- Tables
-- ============================================================

create table if not exists places (
  id          uuid primary key default gen_random_uuid(),
  place_id    text unique not null,                 -- Google Place ID
  name        text,
  address     text,
  created_at  timestamptz not null default now()
);

create table if not exists reviews (
  id                uuid primary key default gen_random_uuid(),
  place_id          uuid not null references places(id) on delete cascade,
  google_review_id  text unique,                    -- chống duplicate khi re-fetch
  author_name       text,
  rating            int check (rating between 1 and 5),
  comment           text,
  review_time       timestamptz,
  status            text not null default 'pending'
                    check (status in ('pending', 'resolved')),
  ai_replies        jsonb,                          -- { standard, friendly, apologetic }
  approved_reply    text,
  approved_tone     text check (approved_tone in ('standard', 'friendly', 'apologetic')),
  approved_at       timestamptz,
  created_at        timestamptz not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================

create index if not exists reviews_place_id_idx on reviews(place_id);
create index if not exists reviews_status_idx   on reviews(status);
create index if not exists reviews_created_at_idx on reviews(created_at desc);

-- ============================================================
-- Row-Level Security
-- ============================================================
-- MVP 0 không có auth → mọi mutation đều đi qua Next.js API route bằng
-- service_role key (bypass RLS). Bật RLS + không cấp policy nào cho anon
-- để client không thể đọc/ghi trực tiếp bằng anon key — đây là defense
-- in-depth phòng khi anon key bị lộ.

alter table places  enable row level security;
alter table reviews enable row level security;

-- (Cố ý không tạo policy nào cho anon role.)

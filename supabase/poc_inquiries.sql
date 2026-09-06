-- Supabase SQL Editor에서 한 번 실행
create table if not exists public.poc_inquiries (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  team        text not null,
  size        text,
  stage       text,
  name        text not null,
  email       text not null,
  tools       text,
  pain        text not null,
  user_agent  text,
  status      text not null default 'new'   -- new / contacted / done
);
-- RLS 켜고 정책은 만들지 않음 → anon/일반 사용자는 읽기·쓰기 불가, service_role(서버 함수)만 접근
alter table public.poc_inquiries enable row level security;

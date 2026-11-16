-- Minimal Supabase platform fixtures for isolated PostgreSQL tests only.
-- Never apply to an existing database or a deployed Supabase project.
create role anon;create role authenticated;create role service_role bypassrls;
create schema auth;create schema storage;create schema realtime;create schema extensions;
alter default privileges in schema public grant all on tables to anon,authenticated;
-- service_role bypasses RLS but does not implicitly receive table privileges.
-- Keep internal tables RPC-only; migrations grant direct integration access explicitly.
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
create table auth.users(id uuid primary key,instance_id uuid,aud text,role text,email text,encrypted_password text,email_confirmed_at timestamptz,raw_app_meta_data jsonb,raw_user_meta_data jsonb,created_at timestamptz,updated_at timestamptz,last_sign_in_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,owner_id text,unique(bucket_id,name));alter table storage.objects enable row level security;
create function storage.foldername(text) returns text[] language sql immutable as $$select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]$$;
create table realtime.messages(id bigint generated always as identity,topic text,extension text,payload jsonb);alter table realtime.messages enable row level security;
create function realtime.topic() returns text language sql stable as $$select current_setting('realtime.topic',true)$$;
grant usage on schema public,auth,storage,realtime,extensions to anon,authenticated,service_role;
grant select on storage.objects to anon,authenticated;grant insert,delete on storage.objects to authenticated;
grant select,insert on realtime.messages to authenticated;create publication supabase_realtime;
create extension pgtap with schema extensions;set search_path=public,extensions;

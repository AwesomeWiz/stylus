begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-polish@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-polish@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'other-polish@example.test', '', now(), '{}', '{}', now(), now());

insert into public.organizations (id, name, created_by)
values
  ('10000000-0000-0000-0000-000000000201', 'Disposable Alpha', '00000000-0000-0000-0000-000000000201'),
  ('10000000-0000-0000-0000-000000000202', 'Protected Beta', '00000000-0000-0000-0000-000000000203');

insert into public.memberships (organization_id, user_id, role)
values
  ('10000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000201', 'OWNER'),
  ('10000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000202', 'ADMIN'),
  ('10000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000203', 'OWNER');

-- A populated tenant must delete atomically too. Empty organizations cannot
-- expose cascade ordering against membership-qualified creator references.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000201', true);
insert into public.boards(id,organization_id,title,created_by,updated_by)
values('20000000-0000-4000-8000-000000000201','10000000-0000-0000-0000-000000000201','Disposable board','00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000201');
insert into public.board_elements(id,organization_id,board_id,element_type,x,y,width,height,content,created_by,updated_by)
values('30000000-0000-4000-8000-000000000201','10000000-0000-0000-0000-000000000201','20000000-0000-4000-8000-000000000201','STICKY',0,0,200,160,'{"text":"Disposable note"}','00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000201');
insert into public.tasks(id,organization_id,title,created_by,updated_by)
values('40000000-0000-4000-8000-000000000201','10000000-0000-0000-0000-000000000201','Disposable task','00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000201');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000202', true);
select throws_ok(
  $$ select public.delete_owned_organization('10000000-0000-0000-0000-000000000201', 'Disposable Alpha') $$,
  '42501', 'owner permission required', 'an ADMIN cannot delete the organization'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000201', true);
select throws_ok(
  $$ select public.delete_owned_organization('10000000-0000-0000-0000-000000000202', 'Protected Beta') $$,
  '42501', 'owner permission required', 'an owner cannot delete another organization'
);
select throws_ok(
  $$ select public.delete_owned_organization('10000000-0000-0000-0000-000000000201', 'disposable alpha') $$,
  '22023', 'confirmation does not match', 'confirmation is exact and case-sensitive'
);
select lives_ok(
  $$ select public.delete_owned_organization('10000000-0000-0000-0000-000000000201', 'Disposable Alpha') $$,
  'the OWNER can delete the confirmed organization'
);

reset role;
select results_eq(
  $$ select count(*)::integer from public.organizations where id = '10000000-0000-0000-0000-000000000201' $$,
  array[0]::integer[], 'the organization is deleted'
);
select results_eq(
  $$ select count(*)::integer from public.memberships where organization_id = '10000000-0000-0000-0000-000000000201' $$,
  array[0]::integer[], 'organization memberships cascade without orphans'
);
select results_eq(
  $$ select count(*)::integer from auth.users where id in ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000202') $$,
  array[2]::integer[], 'member authentication accounts are preserved'
);
select is((select count(*)::integer from public.board_elements where organization_id='10000000-0000-0000-0000-000000000201'),0,'populated Board content is removed without membership orphans');
select is((select count(*)::integer from public.organizations where id='10000000-0000-0000-0000-000000000202'),1,'unrelated organization remains');
select is((select count(*)::integer from public.tasks where organization_id='10000000-0000-0000-0000-000000000201'),0,'populated Tasks are removed without creator-reference orphans');
select ok(not exists(select 1 from pg_catalog.pg_constraint k join pg_catalog.pg_class c on c.oid=k.conrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where k.contype='f' and n.nspname='public' and not k.convalidated),'every application foreign key remains validated');
select ok(not exists(
  select 1 from pg_catalog.pg_constraint k
  join pg_catalog.pg_class c on c.oid=k.conrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  join pg_catalog.pg_class p on p.oid=k.confrelid join pg_catalog.pg_namespace pn on pn.oid=p.relnamespace
  where k.contype='f' and n.nspname='public' and pn.nspname='public' and k.confdeltype in('a','r')
    and exists(select 1 from pg_catalog.pg_attribute a where a.attrelid=c.oid and a.attname='organization_id' and not a.attisdropped)
    and exists(select 1 from pg_catalog.pg_attribute a where a.attrelid=p.oid and a.attname='organization_id' and not a.attisdropped)
    and (not k.condeferrable or k.confdeltype='r')
),'tenant reference checks can defer only for a complete transaction, without RESTRICT cascade ordering');

select * from finish();
rollback;

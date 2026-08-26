begin;

create extension if not exists pgtap with schema extensions;
select plan(23);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
('00000000-0000-0000-0000-000000000071','00000000-0000-0000-0000-000000000000','authenticated','authenticated','owner@example.test','',now(),'{}','{"full_name":"Owner"}',now(),now()),
('00000000-0000-0000-0000-000000000072','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin@example.test','',now(),'{}','{"full_name":"Admin"}',now(),now()),
('00000000-0000-0000-0000-000000000073','00000000-0000-0000-0000-000000000000','authenticated','authenticated','member@example.test','',now(),'{}','{"full_name":"Member"}',now(),now()),
('00000000-0000-0000-0000-000000000074','00000000-0000-0000-0000-000000000000','authenticated','authenticated','viewer@example.test','',now(),'{}','{"full_name":"Viewer"}',now(),now()),
('00000000-0000-0000-0000-000000000075','00000000-0000-0000-0000-000000000000','authenticated','authenticated','invitee@example.test','',now(),'{}','{"full_name":"Invitee"}',now(),now()),
('00000000-0000-0000-0000-000000000076','00000000-0000-0000-0000-000000000000','authenticated','authenticated','wrong@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000077','00000000-0000-0000-0000-000000000000','authenticated','authenticated','other-owner@example.test','',now(),'{}','{}',now(),now());

insert into public.organizations (id,name,created_by) values
('10000000-0000-0000-0000-000000000071','Alpha','00000000-0000-0000-0000-000000000071'),
('10000000-0000-0000-0000-000000000072','Beta','00000000-0000-0000-0000-000000000077');
insert into public.memberships (organization_id,user_id,role) values
('10000000-0000-0000-0000-000000000071','00000000-0000-0000-0000-000000000071','OWNER'),
('10000000-0000-0000-0000-000000000071','00000000-0000-0000-0000-000000000072','ADMIN'),
('10000000-0000-0000-0000-000000000071','00000000-0000-0000-0000-000000000073','MEMBER'),
('10000000-0000-0000-0000-000000000071','00000000-0000-0000-0000-000000000074','VIEWER'),
('10000000-0000-0000-0000-000000000072','00000000-0000-0000-0000-000000000077','OWNER');

set local role anon;
select is_empty($$ select id from public.organization_invitations $$, 'anonymous users cannot enumerate invitations');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000071',true);
select lives_ok($$ select public.create_organization_invitation('10000000-0000-0000-0000-000000000071','invitee@example.test','MEMBER',encode(extensions.digest('member-token','sha256'),'hex'),now()+interval '7 days') $$,'OWNER can invite MEMBER');
select lives_ok($$ select public.create_organization_invitation('10000000-0000-0000-0000-000000000071','new-viewer@example.test','VIEWER',encode(extensions.digest('viewer-token','sha256'),'hex'),now()+interval '7 days') $$,'OWNER can invite VIEWER');
select throws_ok($$ select public.create_organization_invitation('10000000-0000-0000-0000-000000000071','invitee@example.test','MEMBER',repeat('a',64),now()+interval '7 days') $$,'23505',null,'duplicate active invitation is rejected');
select throws_ok($$ select public.create_organization_invitation('10000000-0000-0000-0000-000000000071','member@example.test','MEMBER',repeat('b',64),now()+interval '7 days') $$,'23505','This email is already an organization member','existing member is handled safely');
select is_empty($$ select * from public.list_organization_invitations('10000000-0000-0000-0000-000000000072') $$,'cross-organization invitations cannot be listed');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000072',true);
select lives_ok($$ select public.create_organization_invitation('10000000-0000-0000-0000-000000000071','admin-invite@example.test','VIEWER',repeat('c',64),now()+interval '7 days') $$,'ADMIN can invite');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000073',true);
select throws_ok($$ select public.create_organization_invitation('10000000-0000-0000-0000-000000000071','blocked@example.test','MEMBER',repeat('d',64),now()+interval '7 days') $$,'42501','Organization management permission required','MEMBER cannot invite');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000074',true);
select throws_ok($$ select public.create_organization_invitation('10000000-0000-0000-0000-000000000071','blocked2@example.test','MEMBER',repeat('e',64),now()+interval '7 days') $$,'42501','Organization management permission required','VIEWER cannot invite');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000076',true);
select throws_ok($$ select public.accept_organization_invitation('member-token') $$,'42501','Invitation email does not match authenticated user','wrong email cannot steal invitation');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000075',true);
select results_eq($$ select public.accept_organization_invitation('member-token') $$,array['10000000-0000-0000-0000-000000000071'::uuid],'acceptance returns invited organization');
select results_eq($$ select role::text from public.memberships where organization_id='10000000-0000-0000-0000-000000000071' and user_id='00000000-0000-0000-0000-000000000075' $$,array['MEMBER']::text[],'acceptance derives the invited role');
select lives_ok($$ select public.accept_organization_invitation('member-token') $$,'duplicate acceptance is idempotent');
select results_eq($$ select count(*)::integer from public.memberships where organization_id='10000000-0000-0000-0000-000000000071' and user_id='00000000-0000-0000-0000-000000000075' $$,array[1]::integer[],'duplicate acceptance does not duplicate membership');
select results_eq($$ select count(*)::integer from public.list_organization_task_members('10000000-0000-0000-0000-000000000071') where member_user_id='00000000-0000-0000-0000-000000000075' $$,array[1]::integer[],'accepted member appears in collaboration directory');

reset role;
insert into public.organization_invitations (organization_id,email,role,token_hash,invited_by,expires_at) values
('10000000-0000-0000-0000-000000000071','expired@example.test','MEMBER',extensions.digest('expired-token','sha256'),'00000000-0000-0000-0000-000000000071',now()-interval '1 day');
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000076',true);
select throws_ok($$ select public.accept_organization_invitation('expired-token') $$,'22023','Invitation has expired','expired invitation is rejected');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000071',true);
select lives_ok($$ select public.revoke_organization_invitation('10000000-0000-0000-0000-000000000071',(select id from public.organization_invitations where email='new-viewer@example.test')) $$,'pending invitation can be cancelled');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000076',true);
select throws_ok($$ select public.accept_organization_invitation('viewer-token') $$,'22023','Invitation is no longer active','revoked invitation is rejected');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000072',true);
select lives_ok($$ select public.update_organization_member_role('10000000-0000-0000-0000-000000000071','00000000-0000-0000-0000-000000000073','VIEWER') $$,'ADMIN can update MEMBER role');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000073',true);
select throws_ok($$ select public.remove_organization_member('10000000-0000-0000-0000-000000000071','00000000-0000-0000-0000-000000000074') $$,'42501','Member management permission required','MEMBER cannot remove another member');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000071',true);
select throws_ok($$ select public.remove_organization_member('10000000-0000-0000-0000-000000000071','00000000-0000-0000-0000-000000000071') $$,'42501','OWNER cannot be removed','final OWNER cannot be removed');
select throws_ok($$ select public.update_organization_member_role('10000000-0000-0000-0000-000000000071','00000000-0000-0000-0000-000000000071','MEMBER') $$,'42501','OWNER roles cannot be changed here','final OWNER cannot be demoted');
select lives_ok($$ select public.remove_organization_member('10000000-0000-0000-0000-000000000071','00000000-0000-0000-0000-000000000074') $$,'OWNER can remove a non-owner member');

select * from finish();
rollback;

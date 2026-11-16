begin;
create extension if not exists pgtap with schema extensions;
select plan(24);
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select ('00000000-0000-4000-8000-00000000008'||n)::uuid,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','board-reaction-'||n||'@example.test','',now(),'{}','{}',now(),now() from generate_series(1,4)n;
insert into public.organizations(id,name,created_by) values
('10000000-0000-4000-8000-000000000081','Reaction Alpha','00000000-0000-4000-8000-000000000081'),
('10000000-0000-4000-8000-000000000082','Reaction Beta','00000000-0000-4000-8000-000000000084');
insert into public.memberships(organization_id,user_id,role) values
('10000000-0000-4000-8000-000000000081','00000000-0000-4000-8000-000000000081','OWNER'),
('10000000-0000-4000-8000-000000000081','00000000-0000-4000-8000-000000000082','MEMBER'),
('10000000-0000-4000-8000-000000000081','00000000-0000-4000-8000-000000000083','VIEWER'),
('10000000-0000-4000-8000-000000000082','00000000-0000-4000-8000-000000000084','OWNER');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000081',true);
insert into public.boards(id,organization_id,title,created_by,updated_by)
select ('20000000-0000-4000-8000-00000000008'||n)::uuid,'10000000-0000-4000-8000-000000000081','Reactions board '||n,'00000000-0000-4000-8000-000000000081','00000000-0000-4000-8000-000000000081' from generate_series(1,2)n;
insert into public.board_elements(id,organization_id,board_id,element_type,x,y,width,height,created_by,updated_by)
select ('30000000-0000-4000-8000-00000000008'||n)::uuid,'10000000-0000-4000-8000-000000000081',('20000000-0000-4000-8000-00000000008'||n)::uuid,'TEXT',0,0,100,100,'00000000-0000-4000-8000-000000000081','00000000-0000-4000-8000-000000000081' from generate_series(1,2)n;
set local role authenticated;
select lives_ok($$select public.set_board_reaction('20000000-0000-4000-8000-000000000081','30000000-0000-4000-8000-000000000081','like',true)$$,'owner reacts');
select lives_ok($$select public.set_board_reaction('20000000-0000-4000-8000-000000000081','30000000-0000-4000-8000-000000000081','like',true)$$,'idempotent repeated set');
select is((select count(*)::int from public.board_reactions),1,'same user has one instance');
select results_eq($$select total,mine from public.read_board_reactions('20000000-0000-4000-8000-000000000081',array['30000000-0000-4000-8000-000000000081']::uuid[])$$,$$select 1,true$$,'aggregate and own state');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000082',true);
select lives_ok($$select public.set_board_reaction('20000000-0000-4000-8000-000000000081','30000000-0000-4000-8000-000000000081','like',true)$$,'member reacts');
select is((select total from public.read_board_reactions('20000000-0000-4000-8000-000000000081',array['30000000-0000-4000-8000-000000000081']::uuid[])),2,'two people aggregate once each');
select lives_ok($$select public.set_board_reaction('20000000-0000-4000-8000-000000000081','30000000-0000-4000-8000-000000000081','like',false)$$,'member removes own reaction');
select is((select total from public.read_board_reactions('20000000-0000-4000-8000-000000000081',array['30000000-0000-4000-8000-000000000081']::uuid[])),1,'removal updates aggregate');
select is((select count(*)::int from public.board_reactions where not active),1,'inactive row remains readable for realtime removal');
select throws_ok($$select public.set_board_reaction('20000000-0000-4000-8000-000000000081','30000000-0000-4000-8000-000000000081','invalid',true)$$,'22023',null,'reaction is bounded');
select throws_ok($$insert into public.board_reactions(organization_id,board_id,element_id,user_id,reaction) values('10000000-0000-4000-8000-000000000081','20000000-0000-4000-8000-000000000081','30000000-0000-4000-8000-000000000081','00000000-0000-4000-8000-000000000081','fire')$$,'42501',null,'direct spoofed writes denied');
select throws_ok($$select public.set_board_reaction('20000000-0000-4000-8000-000000000081','30000000-0000-4000-8000-000000000082','fire',true)$$,'42501',null,'cross-board targets denied');
select throws_ok($$select public.read_board_reactions('20000000-0000-4000-8000-000000000081',array_fill('30000000-0000-4000-8000-000000000081'::uuid,array[201]))$$,'22023',null,'read target count bounded');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000083',true);
select is((select total from public.read_board_reactions('20000000-0000-4000-8000-000000000081',array['30000000-0000-4000-8000-000000000081']::uuid[])),1,'viewer reads');
select throws_ok($$select public.set_board_reaction('20000000-0000-4000-8000-000000000081','30000000-0000-4000-8000-000000000081','fire',true)$$,'42501',null,'viewer cannot react');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000084',true);
select is_empty($$select * from public.board_reactions$$,'foreign organization reads no identity or feedback');
select throws_ok($$select public.read_board_reactions('20000000-0000-4000-8000-000000000081',array['30000000-0000-4000-8000-000000000081']::uuid[])$$,'42501',null,'foreign aggregate denied');
select throws_ok($$select public.set_board_reaction('20000000-0000-4000-8000-000000000081','30000000-0000-4000-8000-000000000081','fire',true)$$,'42501',null,'foreign write denied');
reset role;
update public.memberships set removed_at=now() where user_id='00000000-0000-4000-8000-000000000082';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000082',true);
select throws_ok($$select public.set_board_reaction('20000000-0000-4000-8000-000000000081','30000000-0000-4000-8000-000000000081','fire',true)$$,'42501',null,'revoked membership denied');
select is_empty($$select * from public.board_reactions$$,'revocation removes read authority');
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000081',true);
update public.board_elements set archived_at=now() where id='30000000-0000-4000-8000-000000000081';
set local role authenticated;
select is_empty($$select * from public.read_board_reactions('20000000-0000-4000-8000-000000000081',array['30000000-0000-4000-8000-000000000081']::uuid[])$$,'archived target hides reactions');
select throws_ok($$select public.set_board_reaction('20000000-0000-4000-8000-000000000081','30000000-0000-4000-8000-000000000081','like',false)$$,'42501',null,'archived target rejects writes');
reset role;
update public.boards set archived_at=now() where id='20000000-0000-4000-8000-000000000081';
set local role authenticated;
select throws_ok($$select public.read_board_reactions('20000000-0000-4000-8000-000000000081',array[]::uuid[])$$,'42501',null,'archived board denied');
set local role anon;
select throws_ok($$select public.set_board_reaction('20000000-0000-4000-8000-000000000081','30000000-0000-4000-8000-000000000081','like',true)$$,'42501',null,'anonymous API denied');
select * from finish();
rollback;

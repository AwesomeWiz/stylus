begin;
create extension if not exists pgtap with schema extensions;
select plan(21);
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

insert into public.board_comments(id,organization_id,board_id,element_id,author_id,body) values
('40000000-0000-4000-8000-000000000081','10000000-0000-4000-8000-000000000081','20000000-0000-4000-8000-000000000081','30000000-0000-4000-8000-000000000081','00000000-0000-4000-8000-000000000081','Preserve this discussion');
insert into public.board_comments(id,organization_id,board_id,element_id,parent_id,author_id,body) values
('40000000-0000-4000-8000-000000000082','10000000-0000-4000-8000-000000000081','20000000-0000-4000-8000-000000000081','30000000-0000-4000-8000-000000000081','40000000-0000-4000-8000-000000000081','00000000-0000-4000-8000-000000000081','Reply');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000082',true);
select lives_ok($$select public.set_board_comment_resolution('20000000-0000-4000-8000-000000000081','40000000-0000-4000-8000-000000000081',true)$$,'editor resolves a thread');
select ok((select resolved_at is not null and resolved_by='00000000-0000-4000-8000-000000000082' from public.board_comments where id='40000000-0000-4000-8000-000000000081'),'resolution provenance recorded');
select results_eq($$select body,author_id from public.board_comments where id='40000000-0000-4000-8000-000000000081'$$,$$select 'Preserve this discussion'::text,'00000000-0000-4000-8000-000000000081'::uuid$$,'resolution does not rewrite content/author');
select is_empty($$select * from public.read_board_comment_counts('20000000-0000-4000-8000-000000000081',array['30000000-0000-4000-8000-000000000081']::uuid[])$$,'resolved thread is absent from open counts');
select lives_ok($$select public.set_board_comment_resolution('20000000-0000-4000-8000-000000000081','40000000-0000-4000-8000-000000000081',false)$$,'editor reopens');
select is((select total from public.read_board_comment_counts('20000000-0000-4000-8000-000000000081',array['30000000-0000-4000-8000-000000000081']::uuid[])),1,'counts include roots, not replies');
select public.set_board_comment_resolution('20000000-0000-4000-8000-000000000081','40000000-0000-4000-8000-000000000081',true);
select lives_ok($$select public.set_board_comment_resolution('20000000-0000-4000-8000-000000000081','40000000-0000-4000-8000-000000000081',true)$$,'repeated resolution is idempotent');
select throws_ok($$update public.board_comments set resolved_at=null,resolved_by=null where id='40000000-0000-4000-8000-000000000081'$$,'42501',null,'direct resolution writes denied');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000083',true);
select is((select count(*)::int from public.board_comments where resolved_at is not null),1,'viewer retains resolved history read');
select throws_ok($$select public.set_board_comment_resolution('20000000-0000-4000-8000-000000000081','40000000-0000-4000-8000-000000000081',false)$$,'42501',null,'viewer cannot resolve/reopen');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000084',true);
select throws_ok($$select public.set_board_comment_resolution('20000000-0000-4000-8000-000000000081','40000000-0000-4000-8000-000000000081',false)$$,'42501',null,'foreign mutation denied');
select throws_ok($$select public.read_board_comment_counts('20000000-0000-4000-8000-000000000081',array[]::uuid[])$$,'42501',null,'foreign counts denied');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000081',true);
select throws_ok($$select public.set_board_comment_resolution('20000000-0000-4000-8000-000000000082','40000000-0000-4000-8000-000000000081',false)$$,'42501',null,'same-org wrong board denied');
select throws_ok($$select public.set_board_comment_resolution('20000000-0000-4000-8000-000000000081','40000000-0000-4000-8000-000000000082',true)$$,'42501',null,'replies cannot resolve independently');
select throws_ok($$select public.read_board_comment_counts('20000000-0000-4000-8000-000000000081',array_fill('30000000-0000-4000-8000-000000000081'::uuid,array[201]))$$,'22023',null,'count read is bounded');
reset role;
update public.memberships set removed_at=now() where user_id='00000000-0000-4000-8000-000000000082';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000082',true);
select throws_ok($$select public.set_board_comment_resolution('20000000-0000-4000-8000-000000000081','40000000-0000-4000-8000-000000000081',false)$$,'42501',null,'revocation freshly checked');
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000081',true);
update public.board_comments set archived_at=now() where id='40000000-0000-4000-8000-000000000081';
set local role authenticated;
select throws_ok($$select public.set_board_comment_resolution('20000000-0000-4000-8000-000000000081','40000000-0000-4000-8000-000000000081',false)$$,'42501',null,'removed thread cannot reopen');
set local role anon;
select throws_ok($$select public.set_board_comment_resolution('20000000-0000-4000-8000-000000000081','40000000-0000-4000-8000-000000000081',false)$$,'42501',null,'anonymous mutation denied');
reset role;
update public.boards set archived_at=now() where id='20000000-0000-4000-8000-000000000081';
set local role authenticated;
select throws_ok($$select public.set_board_comment_resolution('20000000-0000-4000-8000-000000000081','40000000-0000-4000-8000-000000000081',true)$$,'42501',null,'archived board rejects resolution');
select throws_ok($$select public.read_board_comment_counts('20000000-0000-4000-8000-000000000081',array[]::uuid[])$$,'42501',null,'archived board rejects counts');
select throws_ok($$select public.set_board_comment_resolution('20000000-0000-4000-8000-000000000081','40000000-0000-4000-8000-000000000081',null)$$,'22023',null,'explicit state required');
select * from finish();rollback;

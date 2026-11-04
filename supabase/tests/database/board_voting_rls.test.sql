begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select ('00000000-0000-4000-8000-00000000009'||n)::uuid,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','board-vote-'||n||'@example.test','',now(),'{}','{}',now(),now() from generate_series(1,4)n;
insert into public.organizations(id,name,created_by) values
('10000000-0000-4000-8000-000000000091','Voting Alpha','00000000-0000-4000-8000-000000000091'),
('10000000-0000-4000-8000-000000000092','Voting Beta','00000000-0000-4000-8000-000000000094');
insert into public.memberships(organization_id,user_id,role) values
('10000000-0000-4000-8000-000000000091','00000000-0000-4000-8000-000000000091','OWNER'),
('10000000-0000-4000-8000-000000000091','00000000-0000-4000-8000-000000000092','MEMBER'),
('10000000-0000-4000-8000-000000000091','00000000-0000-4000-8000-000000000093','VIEWER'),
('10000000-0000-4000-8000-000000000092','00000000-0000-4000-8000-000000000094','OWNER');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000091',true);
insert into public.boards(id,organization_id,title,created_by,updated_by)
select ('20000000-0000-4000-8000-00000000009'||n)::uuid,'10000000-0000-4000-8000-000000000091','Voting board '||n,'00000000-0000-4000-8000-000000000091','00000000-0000-4000-8000-000000000091' from generate_series(1,2)n;
insert into public.board_elements(id,organization_id,board_id,element_type,x,y,width,height,content,created_by,updated_by)
select ('30000000-0000-4000-8000-00000000009'||n)::uuid,'10000000-0000-4000-8000-000000000091',case when n=2 then '20000000-0000-4000-8000-000000000092'::uuid else '20000000-0000-4000-8000-000000000091'::uuid end,
case when n=4 then 'SECTION'::public.board_element_type else 'TEXT'::public.board_element_type end,0,0,100,100,case when n=4 then '{"title":"Section"}'::jsonb else '{"text":"Concept"}'::jsonb end,'00000000-0000-4000-8000-000000000091','00000000-0000-4000-8000-000000000091' from generate_series(1,4)n;
set local role authenticated;
reset role;
insert into public.board_elements(id,organization_id,board_id,element_type,x,y,width,height,content,created_by,updated_by) values
('30000000-0000-4000-8000-000000000095','10000000-0000-4000-8000-000000000091','20000000-0000-4000-8000-000000000091','GROUP',0,0,300,300,'{"title":"Locked Group"}','00000000-0000-4000-8000-000000000091','00000000-0000-4000-8000-000000000091');
insert into public.board_elements(id,organization_id,board_id,parent_id,element_type,x,y,width,height,content,created_by,updated_by) values
('30000000-0000-4000-8000-000000000096','10000000-0000-4000-8000-000000000091','20000000-0000-4000-8000-000000000091','30000000-0000-4000-8000-000000000095','TEXT',10,10,100,100,'{"text":"Child"}','00000000-0000-4000-8000-000000000091','00000000-0000-4000-8000-000000000091');
update public.board_elements set locked=true where id='30000000-0000-4000-8000-000000000095';
set local role authenticated;
select throws_ok($$select public.start_board_voting('20000000-0000-4000-8000-000000000091',6,array['TEXT'])$$,'22023',null,'allowance bounded');
select throws_ok($$select public.start_board_voting('20000000-0000-4000-8000-000000000091',3,array['SECTION'])$$,'22023',null,'Section excluded');
select throws_ok($$select public.start_board_voting('20000000-0000-4000-8000-000000000091',3,array['TEXT','TEXT'])$$,'22023',null,'duplicate type configuration rejected');
select lives_ok($$select public.start_board_voting('20000000-0000-4000-8000-000000000091',3,array['TEXT','GROUP','IMAGE','SHAPE','STICKY'])$$,'editor starts visible voting');
select set_config('qa.voting_session',(select id::text from public.board_voting_sessions where status='ACTIVE'),true);
select throws_ok($$select public.start_board_voting('20000000-0000-4000-8000-000000000091',1,array['TEXT'])$$,'23505',null,'one active session per Board');
select lives_ok($$select public.set_board_vote(current_setting('qa.voting_session')::uuid,'30000000-0000-4000-8000-000000000091',1,true,'40000000-0000-4000-8000-000000000091',0)$$,'cast own first slot');
select lives_ok($$select public.set_board_vote(current_setting('qa.voting_session')::uuid,'30000000-0000-4000-8000-000000000091',1,true,'40000000-0000-4000-8000-000000000091',0)$$,'same request is idempotent');
select is((select count(*)::int from public.board_votes where active),1,'retry does not double vote');
select throws_ok($$select public.set_board_vote(current_setting('qa.voting_session')::uuid,'30000000-0000-4000-8000-000000000091',1,true,'40000000-0000-4000-8000-000000000092',0)$$,'PT409',null,'stale concurrent slot write rejected');
select lives_ok($$select public.set_board_vote(current_setting('qa.voting_session')::uuid,'30000000-0000-4000-8000-000000000091',2,true,gen_random_uuid(),0)$$,'multiple votes on same object supported');
select lives_ok($$select public.set_board_vote(current_setting('qa.voting_session')::uuid,'30000000-0000-4000-8000-000000000093',3,true,gen_random_uuid(),0)$$,'allocate final slot elsewhere');
select throws_ok($$select public.set_board_vote(current_setting('qa.voting_session')::uuid,'30000000-0000-4000-8000-000000000091',4,true,gen_random_uuid(),0)$$,'22023',null,'cannot exceed server allowance');
select throws_ok($$update public.board_votes set voter_id='00000000-0000-4000-8000-000000000092'$$,'42501',null,'cannot modify another participant through direct writes');
select throws_ok($$delete from public.board_votes$$,'42501',null,'direct vote deletes denied');
select throws_ok($$update public.board_voting_sessions set allowance=5$$,'42501',null,'direct session configuration writes denied');
select lives_ok($$select public.set_board_vote(current_setting('qa.voting_session')::uuid,'30000000-0000-4000-8000-000000000091',1,false,gen_random_uuid(),1)$$,'remove own allocation');
select is((select count(*)::int from public.board_votes where active),2,'removal decrements exactly once');
select lives_ok($$select public.set_board_vote(current_setting('qa.voting_session')::uuid,'30000000-0000-4000-8000-000000000093',1,true,gen_random_uuid(),2)$$,'reuse own inactive versioned slot');
select throws_ok($$select public.set_board_vote(current_setting('qa.voting_session')::uuid,'30000000-0000-4000-8000-000000000091',1,true,'40000000-0000-4000-8000-000000000091',0)$$,'PT409',null,'delayed retry cannot overwrite reused slot');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000092',true);
select lives_ok($$select public.set_board_vote(current_setting('qa.voting_session')::uuid,'30000000-0000-4000-8000-000000000091',1,true,gen_random_uuid(),0)$$,'member participates with independent allowance');
select throws_ok($$select public.end_board_voting(current_setting('qa.voting_session')::uuid)$$,'42501',null,'unrelated member cannot end owner session');
select throws_ok($$select public.set_board_vote(current_setting('qa.voting_session')::uuid,'30000000-0000-4000-8000-000000000092',2,true,gen_random_uuid(),0)$$,'22023',null,'cross-board object rejected');
select throws_ok($$select public.set_board_vote(current_setting('qa.voting_session')::uuid,'30000000-0000-4000-8000-000000000094',2,true,gen_random_uuid(),0)$$,'22023',null,'Section target rejected');
select throws_ok($$select public.set_board_vote(current_setting('qa.voting_session')::uuid,'30000000-0000-4000-8000-000000000095',2,true,gen_random_uuid(),0)$$,'22023',null,'locked Group rejected');
select throws_ok($$select public.set_board_vote(current_setting('qa.voting_session')::uuid,'30000000-0000-4000-8000-000000000096',2,true,gen_random_uuid(),0)$$,'22023',null,'inherited Group lock cannot be bypassed');
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000091',true);
update public.board_elements set locked=true where id='30000000-0000-4000-8000-000000000093';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000092',true);
select throws_ok($$select public.set_board_vote(current_setting('qa.voting_session')::uuid,'30000000-0000-4000-8000-000000000093',2,true,gen_random_uuid(),0)$$,'22023',null,'locked target rejected');
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000091',true);
update public.board_elements set locked=false,archived_at=now() where id='30000000-0000-4000-8000-000000000093';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000092',true);
select throws_ok($$select public.set_board_vote(current_setting('qa.voting_session')::uuid,'30000000-0000-4000-8000-000000000093',2,true,gen_random_uuid(),0)$$,'22023',null,'archived target rejected');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000091',true);
select lives_ok($$select public.set_board_vote(current_setting('qa.voting_session')::uuid,'30000000-0000-4000-8000-000000000093',3,false,gen_random_uuid(),1)$$,'may reclaim own archived allocation during active session');
reset role;
update public.board_elements set archived_at=null where id='30000000-0000-4000-8000-000000000093';
set local role authenticated;
select lives_ok($$select public.set_board_vote(current_setting('qa.voting_session')::uuid,'30000000-0000-4000-8000-000000000093',3,true,gen_random_uuid(),2)$$,'reclaimed slot may vote after target restore');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000092',true);
select is((public.read_board_voting('20000000-0000-4000-8000-000000000091',array['30000000-0000-4000-8000-000000000091']::uuid[])#>>'{summaries,0,total}')::int,2,'two users aggregate exact slots');
select is((public.read_board_voting('20000000-0000-4000-8000-000000000091',array[]::uuid[])#>>'{results,0,rank}')::int,1,'deterministic dense rank');
select is((public.read_board_voting('20000000-0000-4000-8000-000000000091',array[]::uuid[])#>>'{results,1,rank}')::int,1,'ties share rank');
select is(public.read_board_voting('20000000-0000-4000-8000-000000000091',array[]::uuid[])#>>'{results,0,element_id}','30000000-0000-4000-8000-000000000091','UUID tie-break provides stable result order');
select is(jsonb_array_length(public.read_board_voting('20000000-0000-4000-8000-000000000091',array[]::uuid[])#>'{results,0,participants}'),2,'participant identities are unique, not repeated per slot');
select lives_ok($$select public.start_board_voting('20000000-0000-4000-8000-000000000092',2,array['TEXT'])$$,'member may host an independent Board session');
select set_config('qa.member_session',(select id::text from public.board_voting_sessions where board_id='20000000-0000-4000-8000-000000000092' and status='ACTIVE'),true);
select lives_ok($$select public.end_board_voting(current_setting('qa.member_session')::uuid)$$,'member starter may end own session');
select throws_ok($$select public.read_board_voting('20000000-0000-4000-8000-000000000091',array_fill('30000000-0000-4000-8000-000000000091'::uuid,array[201]))$$,'22023',null,'projection bounded');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000093',true);
select lives_ok($$select public.read_board_voting('20000000-0000-4000-8000-000000000091',array[]::uuid[])$$,'VIEWER reads results');
select throws_ok($$select public.set_board_vote(current_setting('qa.voting_session')::uuid,'30000000-0000-4000-8000-000000000091',1,true,gen_random_uuid(),0)$$,'42501',null,'VIEWER cannot cast');
select throws_ok($$select public.start_board_voting('20000000-0000-4000-8000-000000000092',3,array['TEXT'])$$,'42501',null,'VIEWER cannot start');
select throws_ok($$select public.end_board_voting(current_setting('qa.voting_session')::uuid)$$,'42501',null,'VIEWER cannot end');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000094',true);
select is_empty($$select * from public.board_voting_sessions$$,'foreign organization sees no session');
select is_empty($$select * from public.board_votes$$,'foreign organization sees no voter identities');
select throws_ok($$select public.read_board_voting('20000000-0000-4000-8000-000000000091',array[]::uuid[])$$,'42501',null,'foreign aggregate rejected');
select throws_ok($$select public.set_board_vote(current_setting('qa.voting_session')::uuid,'30000000-0000-4000-8000-000000000091',1,true,gen_random_uuid(),0)$$,'42501',null,'foreign cast rejected');
reset role;
update public.memberships set removed_at=now() where user_id='00000000-0000-4000-8000-000000000092';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000092',true);
select is_empty($$select * from public.board_votes$$,'revocation removes read access');
select throws_ok($$select public.set_board_vote(current_setting('qa.voting_session')::uuid,'30000000-0000-4000-8000-000000000091',2,true,gen_random_uuid(),0)$$,'42501',null,'revocation removes write access');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000091',true);
select lives_ok($$select public.end_board_voting(current_setting('qa.voting_session')::uuid)$$,'starter ends session');
select lives_ok($$select public.end_board_voting(current_setting('qa.voting_session')::uuid)$$,'ending is idempotent');
select throws_ok($$select public.set_board_vote(current_setting('qa.voting_session')::uuid,'30000000-0000-4000-8000-000000000091',2,false,gen_random_uuid(),1)$$,'55000',null,'ended votes cannot be removed');
select throws_ok($$select public.set_board_vote(current_setting('qa.voting_session')::uuid,'30000000-0000-4000-8000-000000000091',1,true,gen_random_uuid(),0)$$,'55000',null,'ended votes cannot be cast');
select is((select count(*)::int from public.board_votes where active),4,'ended allocations preserved');
select lives_ok($$select public.start_board_voting('20000000-0000-4000-8000-000000000091',1,array['TEXT'])$$,'new session can follow ended session');
select is((select count(*)::int from public.board_voting_sessions),3,'previous sessions remain audited');
-- Large ranked results remain bounded and preserve tie order across pages.
reset role;
create temporary table qa_bulk_votes as select n,gen_random_uuid() as actor,gen_random_uuid() as element from generate_series(1,130)n;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select actor,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','vote-page-'||n||'@example.test','',now(),'{}','{}',now(),now() from qa_bulk_votes;
insert into public.memberships(organization_id,user_id,role) select '10000000-0000-4000-8000-000000000091',actor,'MEMBER' from qa_bulk_votes;
insert into public.board_elements(id,organization_id,board_id,element_type,x,y,width,height,content,created_by,updated_by)
select element,'10000000-0000-4000-8000-000000000091','20000000-0000-4000-8000-000000000091','TEXT',0,0,100,100,'{"text":"Paged concept"}','00000000-0000-4000-8000-000000000091','00000000-0000-4000-8000-000000000091' from qa_bulk_votes where n<=105;
insert into public.board_votes(organization_id,board_id,session_id,voter_id,slot,element_id,active,version,request_id)
select '10000000-0000-4000-8000-000000000091','20000000-0000-4000-8000-000000000091',s.id,b.actor,1,case when n<=105 then b.element else (select element from qa_bulk_votes where n=1) end,true,1,gen_random_uuid()
from qa_bulk_votes b cross join public.board_voting_sessions s where s.board_id='20000000-0000-4000-8000-000000000091' and s.status='ACTIVE';
set local role authenticated;
select set_config('qa.bulk_page',public.read_board_voting('20000000-0000-4000-8000-000000000091',array[]::uuid[])::text,true);
select is(jsonb_array_length(current_setting('qa.bulk_page')::jsonb->'results'),100,'ranked page is capped at 100 objects');
select ok((current_setting('qa.bulk_page')::jsonb->>'has_more')::boolean,'ranked first page signals continuation');
select is(jsonb_array_length(current_setting('qa.bulk_page')::jsonb#>'{results,0,participants}'),20,'participant projection is capped at 20 unique identities');
select set_config('qa.bulk_tail',public.read_board_voting('20000000-0000-4000-8000-000000000091',array[]::uuid[],(current_setting('qa.bulk_page')::jsonb#>>'{results,99,total}')::int,(current_setting('qa.bulk_page')::jsonb#>>'{results,99,element_id}')::uuid)::text,true);
select is(jsonb_array_length(current_setting('qa.bulk_tail')::jsonb->'results'),5,'keyset continuation returns all five remaining tied results');
select ok(not (current_setting('qa.bulk_tail')::jsonb->>'has_more')::boolean,'final page ends the cursor');
select is_empty($$select 1 from jsonb_array_elements(current_setting('qa.bulk_page')::jsonb->'results') a join jsonb_array_elements(current_setting('qa.bulk_tail')::jsonb->'results') b on a->>'element_id'=b->>'element_id'$$,'ranked keyset pages never duplicate an object');
set local role anon;
select throws_ok($$select public.start_board_voting('20000000-0000-4000-8000-000000000091',1,array['TEXT'])$$,'42501',null,'anonymous API denied');
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000091',true);
update public.boards set archived_at=now() where id='20000000-0000-4000-8000-000000000091';
set local role authenticated;
select throws_ok($$select public.read_board_voting('20000000-0000-4000-8000-000000000091',array[]::uuid[])$$,'42501',null,'archived Board rejects snapshot');
select is_empty($$select * from public.board_votes$$,'archived Board hides stored votes and identities');
select * from finish();
rollback;

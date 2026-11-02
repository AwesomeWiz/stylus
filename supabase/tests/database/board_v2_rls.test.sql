begin;
create extension if not exists pgtap with schema extensions;
select plan(59);

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select id::uuid,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',email,'',now(),'{}','{}',now(),now()
from (values
 ('00000000-0000-4000-8000-000000000071','board-v2-owner@example.test'),
 ('00000000-0000-4000-8000-000000000072','board-v2-member@example.test'),
 ('00000000-0000-4000-8000-000000000073','board-v2-viewer@example.test'),
 ('00000000-0000-4000-8000-000000000074','board-v2-other@example.test')) fixture(id,email);
insert into public.organizations(id,name,created_by) values
 ('10000000-0000-4000-8000-000000000071','Board V2 Alpha','00000000-0000-4000-8000-000000000071'),
 ('10000000-0000-4000-8000-000000000072','Board V2 Beta','00000000-0000-4000-8000-000000000074');
insert into public.memberships(organization_id,user_id,role) values
 ('10000000-0000-4000-8000-000000000071','00000000-0000-4000-8000-000000000071','OWNER'),
 ('10000000-0000-4000-8000-000000000071','00000000-0000-4000-8000-000000000072','MEMBER'),
 ('10000000-0000-4000-8000-000000000071','00000000-0000-4000-8000-000000000073','VIEWER'),
 ('10000000-0000-4000-8000-000000000072','00000000-0000-4000-8000-000000000074','OWNER');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000071',true);
insert into public.boards(id,organization_id,title,created_by,updated_by) values
 ('20000000-0000-4000-8000-000000000071','10000000-0000-4000-8000-000000000071','Alpha','00000000-0000-4000-8000-000000000071','00000000-0000-4000-8000-000000000071'),
 ('20000000-0000-4000-8000-000000000073','10000000-0000-4000-8000-000000000071','Other Alpha board','00000000-0000-4000-8000-000000000071','00000000-0000-4000-8000-000000000071');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000074',true);
insert into public.boards(id,organization_id,title,created_by,updated_by) values
 ('20000000-0000-4000-8000-000000000072','10000000-0000-4000-8000-000000000072','Beta','00000000-0000-4000-8000-000000000074','00000000-0000-4000-8000-000000000074');

create function pg_temp.object(id uuid, kind text, x float8, y float8, parent uuid default null, extra jsonb default '{}')
returns jsonb language sql as $$select jsonb_build_object('id',id,'element_type',kind,'x',x,'y',y,'width',100,'height',100,'rotation',0,'z_index',10,
 'parent_id',parent,'locked',false,'content',case when kind='SECTION' then '{"title":"Section","collapsed":false}'::jsonb else '{}'::jsonb end,'style','{}'::jsonb,'metadata','{}'::jsonb)||extra$$;
create function pg_temp.projection(id uuid, changes jsonb default '{}') returns jsonb language sql as $$
 select (to_jsonb(e)-array['board_id','organization_id','created_at','created_by','updated_at','updated_by','archived_at'])||changes from public.board_elements e where e.id=$1
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000072',true);
select lives_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000071',jsonb_build_array(
 pg_temp.object('30000000-0000-4000-8000-000000000010','SECTION',0,0),
 pg_temp.object('30000000-0000-4000-8000-000000000011','GROUP',10,10,'30000000-0000-4000-8000-000000000010'),
 pg_temp.object('30000000-0000-4000-8000-000000000012','STICKY',20,30,'30000000-0000-4000-8000-000000000011','{"content":{"text":"Idea"}}'),
 pg_temp.object('30000000-0000-4000-8000-000000000013','TEXT',300,20,'30000000-0000-4000-8000-000000000010')))$$,
 'a MEMBER initializes a scoped native hierarchy atomically');
select results_eq($$select parent_id from public.board_elements where id='30000000-0000-4000-8000-000000000012'$$,
 array['30000000-0000-4000-8000-000000000011'::uuid],'an object has one explicit parent');
select lives_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000071',jsonb_build_array(pg_temp.projection('30000000-0000-4000-8000-000000000011','{"x":110,"y":60}')))$$,'group move is accepted');
select results_eq($$select x::int,y::int from public.board_elements where id='30000000-0000-4000-8000-000000000012'$$,$$select 120,80$$,'group movement translates its child');
select lives_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000071',jsonb_build_array(pg_temp.projection('30000000-0000-4000-8000-000000000010','{"x":50,"y":60}')))$$,'Section move is accepted');
select results_eq($$select x::int,y::int from public.board_elements where id='30000000-0000-4000-8000-000000000012'$$,$$select 170,140$$,'Section movement translates nested group members once');
select results_eq($$select x::int,y::int from public.board_elements where id='30000000-0000-4000-8000-000000000013'$$,$$select 350,80$$,'Section movement translates direct children');
select lives_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000071',jsonb_build_array(pg_temp.projection('30000000-0000-4000-8000-000000000010','{"x":40,"y":50,"width":800,"height":600}')))$$,'Section bounds can resize');
select results_eq($$select x::int,y::int,width::int,height::int from public.board_elements where id='30000000-0000-4000-8000-000000000012'$$,$$select 170,140,100,100$$,'bounds resize never scales or moves children');
select lives_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000071',jsonb_build_array(pg_temp.projection('30000000-0000-4000-8000-000000000012','{"locked":true}')))$$,'lock persists');
select throws_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000071',jsonb_build_array(pg_temp.projection('30000000-0000-4000-8000-000000000011','{"x":200,"y":150}')))$$,'23514',null,'a locked child rejects the complete group move');
select results_eq($$select x::int from public.board_elements where id in ('30000000-0000-4000-8000-000000000011','30000000-0000-4000-8000-000000000012') order by id$$,array[160,170]::integer[],'failed movement leaves both group and child untouched');
select lives_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000071',jsonb_build_array(pg_temp.projection('30000000-0000-4000-8000-000000000012','{"locked":false}')))$$,'explicit unlock succeeds');
select throws_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000071',jsonb_build_array(pg_temp.object('30000000-0000-4000-8000-000000000020','SECTION',0,0,'30000000-0000-4000-8000-000000000010')))$$,'23514',null,'nested Sections are rejected');
select throws_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000071',jsonb_build_array(pg_temp.object('30000000-0000-4000-8000-000000000020','GROUP',0,0,'30000000-0000-4000-8000-000000000011')))$$,'23514',null,'nested groups are rejected');
select throws_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000071',jsonb_build_array(pg_temp.projection('30000000-0000-4000-8000-000000000011','{"parent_id":"30000000-0000-4000-8000-000000000011"}')))$$,'23514',null,'self ownership cannot create a cycle');
select throws_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000071',jsonb_build_array(pg_temp.object('30000000-0000-4000-8000-000000000020','TEXT',0,0,'30000000-0000-4000-8000-000000000013')))$$,'23514',null,'ordinary objects cannot own children');
select lives_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000073',jsonb_build_array(pg_temp.object('30000000-0000-4000-8000-000000000090','SECTION',0,0)))$$,'same organization second board setup');
select throws_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000071',jsonb_build_array(pg_temp.object('30000000-0000-4000-8000-000000000020','TEXT',0,0,'30000000-0000-4000-8000-000000000090')))$$,'23514',null,'parent membership is board scoped even within one organization');
select throws_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000071',jsonb_build_array(pg_temp.object('30000000-0000-4000-8000-000000000020','TEXT',1,1),pg_temp.object('30000000-0000-4000-8000-000000000021','TEXT',2,2,null,'{"width":1}')))$$,'23514',null,'one invalid child rejects an entire multi-object operation');
select is_empty($$select id from public.board_elements where id='30000000-0000-4000-8000-000000000020'$$,'valid earlier entries also roll back');
select throws_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000071',jsonb_build_array(pg_temp.projection('30000000-0000-4000-8000-000000000011','{"element_type":"SECTION"}')))$$,'23514',null,'object type is immutable');
select throws_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000071',jsonb_build_array(pg_temp.object('30000000-0000-4000-8000-000000000020','LINK',0,0,null,'{"content":{"title":"Unsafe","url":"javascript:alert(1)"}}')))$$,'23514',null,'executable links are rejected by the database');
select lives_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000071',jsonb_build_array(pg_temp.object('30000000-0000-4000-8000-000000000014','LINK',0,0,null,'{"content":{"title":"Source","url":"https://example.test/reference","note":"Human context"}}')))$$,'manual safe links need no network fetch');
select throws_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000071',jsonb_build_array(pg_temp.object('30000000-0000-4000-8000-000000000020','IMAGE',0,0,null,'{"metadata":{"storagePath":"10000000-0000-4000-8000-000000000072/private.png"}}')))$$,'23514',null,'private images cannot reference a foreign organization path');
select lives_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000071',jsonb_build_array(pg_temp.object('30000000-0000-4000-8000-000000000015','IMAGE',0,0,null,'{"content":{"alt":"Reference","caption":"Keep this caption"},"metadata":{"storagePath":"10000000-0000-4000-8000-000000000071/20000000-0000-4000-8000-000000000071/original.png"}}')))$$,'private image metadata remains board scoped');
select throws_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000071',jsonb_build_array(pg_temp.object(gen_random_uuid(),'IMAGE',0,0,null,'{"metadata":{"storagePath":"10000000-0000-4000-8000-000000000071/20000000-0000-4000-8000-000000000071/../../foreign.png"}}')))$$,'23514',null,'private asset paths cannot traverse their scoped prefix');
select throws_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000071',jsonb_build_array(pg_temp.object(gen_random_uuid(),'IMAGE',0,0,null,'{"metadata":{"storagePath":"10000000-0000-4000-8000-000000000071/20000000-0000-4000-8000-000000000071/%2e%2e/foreign.png"}}')))$$,'23514',null,'encoded path segments cannot escape private asset scope');
select throws_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000071',jsonb_build_array(pg_temp.object(gen_random_uuid(),'IMAGE',0,0,null,'{"metadata":{"storagePath":"10000000-0000-4000-8000-000000000071/20000000-0000-4000-8000-000000000071/file.png?token=secret"}}')))$$,'23514',null,'persisted image keys cannot contain signed URL tokens');
select lives_ok($$select public.create_board_comment('20000000-0000-4000-8000-000000000071','30000000-0000-4000-8000-000000000015',null,'Image discussion','{}')$$,'image comments bind to object identity');
select lives_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000071',jsonb_build_array(pg_temp.projection('30000000-0000-4000-8000-000000000015','{"metadata":{"storagePath":"10000000-0000-4000-8000-000000000071/20000000-0000-4000-8000-000000000071/replacement.png"}}')))$$,'image source replacement updates the existing row');
select results_eq($$select e.content->>'caption',c.body from public.board_elements e join public.board_comments c on c.element_id=e.id where e.id='30000000-0000-4000-8000-000000000015'$$,$$select 'Keep this caption'::text,'Image discussion'::text$$,'replacement retains caption and discussion identity');
select throws_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000071','[]',array['30000000-0000-4000-8000-000000000010'::uuid])$$,'23514',null,'archiving a Section requires an explicit child decision');
select lives_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000071',jsonb_build_array(pg_temp.projection('30000000-0000-4000-8000-000000000011','{"parent_id":null}'),pg_temp.projection('30000000-0000-4000-8000-000000000013','{"parent_id":null}')),array['30000000-0000-4000-8000-000000000010'::uuid])$$,'keeping Section children detaches direct ownership atomically');
select results_eq($$select parent_id from public.board_elements where id='30000000-0000-4000-8000-000000000012'$$,array['30000000-0000-4000-8000-000000000011'::uuid],'keeping a Section preserves its child group');
select lives_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000071',jsonb_build_array(pg_temp.projection('30000000-0000-4000-8000-000000000010'),pg_temp.projection('30000000-0000-4000-8000-000000000011','{"parent_id":"30000000-0000-4000-8000-000000000010"}'),pg_temp.projection('30000000-0000-4000-8000-000000000013','{"parent_id":"30000000-0000-4000-8000-000000000010"}')))$$,'undo restores native ownership without changing identities');
select lives_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000071','[]',array['30000000-0000-4000-8000-000000000010'::uuid,'30000000-0000-4000-8000-000000000011'::uuid,'30000000-0000-4000-8000-000000000012'::uuid,'30000000-0000-4000-8000-000000000013'::uuid])$$,'archiving all descendants is one transaction');
select results_eq($$select count(*)::int from public.board_elements where archived_at is not null and id in ('30000000-0000-4000-8000-000000000010','30000000-0000-4000-8000-000000000011','30000000-0000-4000-8000-000000000012','30000000-0000-4000-8000-000000000013')$$,array[4],'archive retains every original row');
select throws_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000071',(select jsonb_agg(pg_temp.object(gen_random_uuid(),'TEXT',0,0)) from generate_series(1,201)))$$,'22023',null,'operations have a server-enforced 200 object bound');
select throws_ok($$select public.create_board_from_template('10000000-0000-4000-8000-000000000071','Bad template','unknown','[]')$$,'23514',null,'unregistered templates do not create boards');
select is_empty($$select id from public.boards where title='Bad template'$$,'failed initialization rolls the board back');
select lives_ok($$select public.create_board_from_template('10000000-0000-4000-8000-000000000071','Blank template','blank','[]')$$,'explicit blank creation records its real template');
select is((select template_key from public.boards where title='Alpha'),null::text,'legacy boards keep an unknown template');
select is_empty($$select id from public.tasks$$,'native board initialization never creates tasks');
select lives_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000073',
 (select jsonb_agg(pg_temp.object(gen_random_uuid(),'TEXT',n,n,'30000000-0000-4000-8000-000000000090')) from generate_series(1,199) n))$$,
 'a Section supports 199 explicitly owned children');
select throws_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000073',jsonb_build_array(
 pg_temp.object('30000000-0000-4000-8000-000000000099','TEXT',0,0,'30000000-0000-4000-8000-000000000090')))$$,'23514',null,
 'a 200th descendant is rejected by the relational invariant');
select results_eq($$select count(*)::int from public.board_elements where parent_id='30000000-0000-4000-8000-000000000090'$$,array[199],
 'a failed container overflow leaves every original child intact');
select lives_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000071','[]',array['30000000-0000-4000-8000-000000000099'::uuid])$$,
 'undo of a failed create is an idempotent scoped no-op');
select throws_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000071',jsonb_build_array(
 pg_temp.object('30000000-0000-4000-8000-000000000015','IMAGE',0,0),pg_temp.object('30000000-0000-4000-8000-000000000015','IMAGE',0,0)))$$,
 '22023',null,'duplicate identities cannot partly overwrite a transaction');
select throws_ok($$select public.create_board_from_template('10000000-0000-4000-8000-000000000071','Invalid objects','campaign',
 jsonb_build_array(pg_temp.object(gen_random_uuid(),'TEXT',0,0,null,'{"width":1}')))$$,'23514',null,'invalid template objects roll back initialization');
select is_empty($$select id from public.boards where title='Invalid objects'$$,'no board remains after failed native initialization');
select throws_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000071',jsonb_build_array(
 pg_temp.object('30000000-0000-4000-8000-000000000090','SECTION',0,0)))$$,'42501',null,'an existing identity cannot be reassigned from another board');
select throws_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000072',jsonb_build_array(pg_temp.object(gen_random_uuid(),'TEXT',0,0)))$$,'42501',null,'foreign boards cannot be mutated');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000073',true);
select ok(exists(select 1 from public.board_elements where board_id='20000000-0000-4000-8000-000000000071'),'VIEWER retains scoped read access');
select throws_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000071',jsonb_build_array(pg_temp.object(gen_random_uuid(),'TEXT',0,0)))$$,'42501',null,'VIEWER cannot execute native mutations');
select throws_ok($$select public.create_board_from_template('10000000-0000-4000-8000-000000000071','Viewer','blank','[]')$$,'42501',null,'VIEWER cannot initialize templates');
reset role;
update public.memberships set removed_at=now() where user_id='00000000-0000-4000-8000-000000000072';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000072',true);
select throws_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000071',jsonb_build_array(pg_temp.object(gen_random_uuid(),'TEXT',0,0)))$$,'42501',null,'revocation is rechecked at every operation');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000071',true);
update public.boards set archived_at=now(),updated_by='00000000-0000-4000-8000-000000000071' where id='20000000-0000-4000-8000-000000000071';
select throws_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000071',jsonb_build_array(pg_temp.object(gen_random_uuid(),'TEXT',0,0)))$$,'42501',null,'archived boards cannot receive mutations');
set local role anon;
select throws_ok($$select public.apply_board_operation('20000000-0000-4000-8000-000000000071','[]','{}')$$,'42501',null,'anonymous callers cannot invoke the mutation API');
select * from finish();
rollback;

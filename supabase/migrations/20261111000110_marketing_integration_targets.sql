-- Trusted host registration: Core never imports or queries Marketing persistence.
insert into private.integration_targets(entity_type,relation,archived_column,plugin_id) values
 ('marketing.hypothesis','public.marketing_hypotheses','archived_at','marketing'),
 ('marketing.experiment','public.marketing_experiments','archived_at','marketing');

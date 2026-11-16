-- Temporary manager-only form drafts; canonical Company tables remain unchanged.
create table public.onboarding_drafts (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  step text not null check(step in('company','problem','product','audience','positioning-brand','marketing','competitors')),
  fields jsonb not null check(jsonb_typeof(fields)='object' and pg_column_size(fields)<=196608),
  base_revision timestamptz,updated_by uuid not null references auth.users(id),updated_at timestamptz not null default clock_timestamp(),
  primary key(organization_id,step)
);
alter table public.onboarding_drafts enable row level security;
create policy onboarding_drafts_manager_read on public.onboarding_drafts for select to authenticated
using(private.has_organization_role(organization_id,array['OWNER','ADMIN']::public.organization_role[]));
revoke all on public.onboarding_drafts from public,anon,authenticated;
grant select on public.onboarding_drafts to authenticated;

-- Revisions reflect the actual serialized write, including separate calls inside
-- one transaction; transaction-start timestamps are unsuitable conflict tokens.
create function private.onboarding_revision_tick() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at:=clock_timestamp();return new;end$$;
create trigger zz_onboarding_revision before update on public.company_profiles for each row execute function private.onboarding_revision_tick();
create trigger zz_onboarding_revision before update on public.audience_profiles for each row execute function private.onboarding_revision_tick();
create trigger zz_onboarding_revision before update on public.brand_profiles for each row execute function private.onboarding_revision_tick();
create trigger zz_onboarding_revision before update on public.marketing_profiles for each row execute function private.onboarding_revision_tick();
create trigger zz_onboarding_revision before update on public.competitors for each row execute function private.onboarding_revision_tick();

create function private.require_onboarding_manager(p_org uuid,p_step text) returns uuid language plpgsql security definer set search_path='' as $$
declare n integer:=array_position(array['company','problem','product','audience','positioning-brand','marketing','competitors'],p_step);begin
  if auth.uid() is null or not private.has_organization_role(p_org,array['OWNER','ADMIN']::public.organization_role[]) then raise exception 'Company management unavailable' using errcode='42501';end if;
  if n is null or n>coalesce((select current_step from public.onboarding_progress where organization_id=p_org),1) then raise exception 'Complete previous steps first' using errcode='22023';end if;
  return auth.uid();
end$$;
create function private.onboarding_revision(p_org uuid,p_step text) returns timestamptz language sql stable security definer set search_path='' as $$
  select case p_step
  when 'audience' then (select updated_at from public.audience_profiles where organization_id=p_org and is_primary)
  when 'marketing' then (select updated_at from public.marketing_profiles where organization_id=p_org)
  when 'competitors' then (select max(updated_at) from public.competitors where organization_id=p_org)
  when 'positioning-brand' then greatest((select updated_at from public.company_profiles where organization_id=p_org),(select updated_at from public.brand_profiles where organization_id=p_org))
  else (select updated_at from public.company_profiles where organization_id=p_org) end;
$$;
-- The next function's static rules are generated from the existing Zod schemas.
create function private.onboarding_schema(p_step text) returns jsonb language sql immutable set search_path='' as $schema$
  select $rules${
  "company": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "companyName": {
        "type": "string",
        "minLength": 2,
        "maxLength": 80
      },
      "industry": {
        "type": "string",
        "minLength": 2,
        "maxLength": 80
      },
      "instagram": {
        "type": "string",
        "maxLength": 200
      },
      "primaryMarket": {
        "type": "string",
        "maxLength": 120
      },
      "shortDescription": {
        "type": "string",
        "minLength": 10,
        "maxLength": 300
      },
      "stage": {
        "type": "string",
        "enum": [
          "IDEA",
          "VALIDATION",
          "PRE_PRODUCT",
          "MVP",
          "BETA",
          "LAUNCHED",
          "GROWTH"
        ]
      },
      "website": {
        "type": "string",
        "maxLength": 300
      }
    },
    "required": [
      "companyName",
      "industry",
      "instagram",
      "primaryMarket",
      "shortDescription",
      "stage",
      "website"
    ],
    "additionalProperties": false
  },
  "problem": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "affectedAudience": {
        "default": "",
        "type": "string",
        "maxLength": 1200
      },
      "coreInsight": {
        "default": "",
        "type": "string",
        "maxLength": 1200
      },
      "currentAlternatives": {
        "default": [],
        "maxItems": 12,
        "type": "array",
        "items": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        }
      },
      "problemImportance": {
        "default": "",
        "type": "string",
        "maxLength": 1200
      },
      "problemStatement": {
        "type": "string",
        "minLength": 10,
        "maxLength": 500
      },
      "startupIdea": {
        "type": "string",
        "minLength": 10,
        "maxLength": 500
      }
    },
    "required": [
      "affectedAudience",
      "coreInsight",
      "currentAlternatives",
      "problemImportance",
      "problemStatement",
      "startupIdea"
    ],
    "additionalProperties": false
  },
  "product": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "coreCapabilities": {
        "default": [],
        "maxItems": 12,
        "type": "array",
        "items": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        }
      },
      "differentiators": {
        "default": [],
        "maxItems": 12,
        "type": "array",
        "items": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        }
      },
      "nearTermObjective": {
        "default": "",
        "type": "string",
        "maxLength": 1200
      },
      "productConcept": {
        "type": "string",
        "minLength": 10,
        "maxLength": 500
      },
      "productStatus": {
        "type": "string",
        "enum": [
          "CONCEPT",
          "RESEARCHING",
          "DESIGNING",
          "BUILDING",
          "TESTING",
          "AVAILABLE"
        ]
      },
      "valueProposition": {
        "type": "string",
        "minLength": 10,
        "maxLength": 500
      }
    },
    "required": [
      "coreCapabilities",
      "differentiators",
      "nearTermObjective",
      "productConcept",
      "productStatus",
      "valueProposition"
    ],
    "additionalProperties": false
  },
  "audience": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "attentionChannels": {
        "default": [],
        "maxItems": 12,
        "type": "array",
        "items": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        }
      },
      "characteristics": {
        "default": [],
        "maxItems": 12,
        "type": "array",
        "items": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        }
      },
      "description": {
        "type": "string",
        "minLength": 10,
        "maxLength": 500
      },
      "goals": {
        "default": [],
        "maxItems": 12,
        "type": "array",
        "items": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        }
      },
      "motivations": {
        "default": [],
        "maxItems": 12,
        "type": "array",
        "items": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        }
      },
      "name": {
        "type": "string",
        "minLength": 2,
        "maxLength": 80
      },
      "objections": {
        "default": [],
        "maxItems": 12,
        "type": "array",
        "items": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        }
      },
      "painPoints": {
        "default": [],
        "maxItems": 12,
        "type": "array",
        "items": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        }
      }
    },
    "required": [
      "attentionChannels",
      "characteristics",
      "description",
      "goals",
      "motivations",
      "name",
      "objections",
      "painPoints"
    ],
    "additionalProperties": false
  },
  "positioning-brand": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "avoid": {
        "default": [],
        "maxItems": 12,
        "type": "array",
        "items": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        }
      },
      "brandStatus": {
        "type": "string",
        "enum": [
          "UNDECIDED",
          "EXPLORING",
          "DEFINED"
        ]
      },
      "communicationTraits": {
        "default": [],
        "maxItems": 12,
        "type": "array",
        "items": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        }
      },
      "desiredEmotions": {
        "default": [],
        "maxItems": 12,
        "type": "array",
        "items": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        }
      },
      "desiredPerception": {
        "default": "",
        "type": "string",
        "maxLength": 1200
      },
      "emphasize": {
        "default": [],
        "maxItems": 12,
        "type": "array",
        "items": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        }
      },
      "keyPromise": {
        "default": "",
        "type": "string",
        "maxLength": 1200
      },
      "personalityTraits": {
        "default": [],
        "maxItems": 12,
        "type": "array",
        "items": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        }
      },
      "positioningCategory": {
        "default": "",
        "type": "string",
        "maxLength": 1200
      },
      "positioningDifference": {
        "type": "string",
        "minLength": 5,
        "maxLength": 500
      },
      "primaryColors": {
        "default": [],
        "maxItems": 12,
        "type": "array",
        "items": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        }
      },
      "reasonsToBelieve": {
        "default": [],
        "maxItems": 12,
        "type": "array",
        "items": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        }
      },
      "statusQuo": {
        "default": "",
        "type": "string",
        "maxLength": 1200
      },
      "toneOfVoice": {
        "default": [],
        "maxItems": 12,
        "type": "array",
        "items": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        }
      },
      "visualDirection": {
        "default": "",
        "type": "string",
        "maxLength": 1200
      }
    },
    "required": [
      "avoid",
      "brandStatus",
      "communicationTraits",
      "desiredEmotions",
      "desiredPerception",
      "emphasize",
      "keyPromise",
      "personalityTraits",
      "positioningCategory",
      "positioningDifference",
      "primaryColors",
      "reasonsToBelieve",
      "statusQuo",
      "toneOfVoice",
      "visualDirection"
    ],
    "additionalProperties": false
  },
  "marketing": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "contentFocus": {
        "default": [],
        "maxItems": 12,
        "type": "array",
        "items": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        }
      },
      "desiredAudienceAction": {
        "default": "",
        "type": "string",
        "maxLength": 1200
      },
      "marketingStage": {
        "type": "string",
        "enum": [
          "NOT_STARTED",
          "EXPERIMENTING",
          "BUILDING_AUDIENCE",
          "CONSISTENT",
          "SCALING"
        ]
      },
      "notes": {
        "default": "",
        "type": "string",
        "maxLength": 1200
      },
      "primaryChannels": {
        "minItems": 1,
        "maxItems": 12,
        "type": "array",
        "items": {
          "type": "string",
          "minLength": 1,
          "maxLength": 160
        }
      },
      "primaryObjective": {
        "type": "string",
        "enum": [
          "AWARENESS",
          "TRUST",
          "AUTHORITY",
          "AUDIENCE_GROWTH",
          "COMMUNITY",
          "WAITLIST",
          "PRODUCT_EDUCATION",
          "VALIDATION",
          "FUTURE_DEMAND"
        ]
      },
      "secondaryObjectives": {
        "default": [],
        "maxItems": 8,
        "type": "array",
        "items": {
          "type": "string",
          "enum": [
            "AWARENESS",
            "TRUST",
            "AUTHORITY",
            "AUDIENCE_GROWTH",
            "COMMUNITY",
            "WAITLIST",
            "PRODUCT_EDUCATION",
            "VALIDATION",
            "FUTURE_DEMAND"
          ]
        }
      }
    },
    "required": [
      "contentFocus",
      "desiredAudienceAction",
      "marketingStage",
      "notes",
      "primaryChannels",
      "primaryObjective",
      "secondaryObjectives"
    ],
    "additionalProperties": false
  },
  "competitors": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "competitors": {
        "maxItems": 20,
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid",
              "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
            },
            "instagram": {
              "default": "",
              "type": "string",
              "maxLength": 300
            },
            "name": {
              "type": "string",
              "minLength": 2,
              "maxLength": 120
            },
            "relevance": {
              "default": "",
              "type": "string",
              "maxLength": 1200
            },
            "shortDescription": {
              "default": "",
              "type": "string",
              "maxLength": 1200
            },
            "type": {
              "type": "string",
              "enum": [
                "DIRECT",
                "INDIRECT",
                "ALTERNATIVE",
                "INSPIRATION"
              ]
            },
            "website": {
              "type": "string",
              "maxLength": 300
            }
          },
          "required": [
            "instagram",
            "name",
            "relevance",
            "shortDescription",
            "type",
            "website"
          ],
          "additionalProperties": false
        }
      }
    },
    "required": [
      "competitors"
    ],
    "additionalProperties": false
  }
}$rules$::jsonb->p_step;
$schema$;

create function private.check_onboarding_value(p_schema jsonb,p_value jsonb,p_partial boolean) returns void language plpgsql set search_path='' as $$
declare key text;rule jsonb;item jsonb;required text;kind text:=p_schema->>'type';raw text:=p_value#>>'{}';begin
  if p_value is null then raise exception 'Missing field' using errcode='22023';end if;
  if kind='object' then
    if jsonb_typeof(p_value)<>'object' or exists(select 1 from jsonb_object_keys(p_value) k where not(p_schema->'properties'?k)) then raise exception 'Invalid fields' using errcode='22023';end if;
    if not p_partial then for required in select jsonb_array_elements_text(coalesce(p_schema->'required','[]')) loop if not(p_value?required) then raise exception 'Missing required field' using errcode='22023';end if;end loop;end if;
    for key,rule in select * from jsonb_each(p_schema->'properties') loop if p_value?key then perform private.check_onboarding_value(rule,p_value->key,p_partial);end if;end loop;
  elsif kind='array' then
    if jsonb_typeof(p_value)<>'array' or jsonb_array_length(p_value)>coalesce((p_schema->>'maxItems')::integer,50) or (not p_partial and jsonb_array_length(p_value)<coalesce((p_schema->>'minItems')::integer,0)) then raise exception 'Invalid list' using errcode='22023';end if;
    for item in select jsonb_array_elements(p_value) loop perform private.check_onboarding_value(p_schema->'items',item,p_partial);end loop;
  elsif kind='string' then
    if jsonb_typeof(p_value)<>'string' or length(raw)>coalesce((p_schema->>'maxLength')::integer,1200) or (not p_partial and length(btrim(raw))<coalesce((p_schema->>'minLength')::integer,0)) then raise exception 'Invalid text' using errcode='22023';end if;
    if p_schema?'enum' and not(p_partial and raw='') and not(p_schema->'enum'?raw) then raise exception 'Invalid choice' using errcode='22023';end if;
    if p_schema->>'format'='uuid' and (not p_partial or raw<>'') then perform raw::uuid;end if;
  else raise exception 'Invalid field schema' using errcode='22023';end if;
end$$;
create function private.check_onboarding_draft(p_step text,p_fields jsonb) returns void language plpgsql set search_path='' as $$
declare schema jsonb:=private.onboarding_schema(p_step);key text;field_values jsonb;normalized jsonb:='{}';rule jsonb;begin
  if schema is null or p_fields is null or jsonb_typeof(p_fields)<>'object' or pg_column_size(p_fields)>196608 then raise exception 'Invalid draft' using errcode='22023';end if;
  for key,field_values in select * from jsonb_each(p_fields) loop
    rule:=schema->'properties'->key;
    if rule is null or jsonb_typeof(field_values)<>'array' or exists(select 1 from jsonb_array_elements(field_values) v where jsonb_typeof(v)<>'string') then raise exception 'Invalid draft fields' using errcode='22023';end if;
    if key='competitors' then
      if jsonb_array_length(field_values)<>1 then raise exception 'Invalid competitors draft' using errcode='22023';end if;
      normalized:=jsonb_set(normalized,array[key],(field_values->>0)::jsonb);
    elsif rule->>'type'='array' then normalized:=jsonb_set(normalized,array[key],field_values);
    else
      if jsonb_array_length(field_values)<>1 then raise exception 'Invalid draft field' using errcode='22023';end if;
      normalized:=jsonb_set(normalized,array[key],field_values->0);
    end if;
  end loop;
  perform private.check_onboarding_value(schema,normalized,true);
end$$;
create function public.read_onboarding_draft(p_organization_id uuid,p_step text)
returns table(fields jsonb,updated_at timestamptz,base_revision timestamptz,conflicted boolean)
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_onboarding_manager(p_organization_id,p_step);current_revision timestamptz:=private.onboarding_revision(p_organization_id,p_step);draft public.onboarding_drafts;begin
  select * into draft from public.onboarding_drafts where organization_id=p_organization_id and step=p_step;
  return query select coalesce(draft.fields,'{}'),draft.updated_at,current_revision,draft.updated_at is not null and draft.base_revision is distinct from current_revision;
end$$;
create function public.save_onboarding_draft(p_organization_id uuid,p_step text,p_fields jsonb,p_base_revision timestamptz,p_expected_updated_at timestamptz)
returns timestamptz language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_onboarding_manager(p_organization_id,p_step);old public.onboarding_drafts;saved timestamptz;begin
  perform pg_advisory_xact_lock(hashtextextended('onboarding:'||p_organization_id::text,0));
  perform private.check_onboarding_draft(p_step,p_fields);
  if private.onboarding_revision(p_organization_id,p_step) is distinct from p_base_revision then raise exception 'Company profile changed; review your draft' using errcode='PT409';end if;
  select * into old from public.onboarding_drafts where organization_id=p_organization_id and step=p_step for update;
  if old.updated_at is distinct from p_expected_updated_at or (old.updated_at is not null and old.base_revision is distinct from p_base_revision) then raise exception 'Draft changed; reload' using errcode='PT409';end if;
  insert into public.onboarding_drafts(organization_id,step,fields,base_revision,updated_by) values(p_organization_id,p_step,p_fields,p_base_revision,actor)
  on conflict(organization_id,step) do update set fields=excluded.fields,base_revision=excluded.base_revision,updated_by=actor,updated_at=clock_timestamp() returning updated_at into saved;
  return saved;
end$$;
create function public.resolve_onboarding_draft(p_organization_id uuid,p_step text,p_expected_updated_at timestamptz,p_keep boolean)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_onboarding_manager(p_organization_id,p_step);draft public.onboarding_drafts;begin
  perform pg_advisory_xact_lock(hashtextextended('onboarding:'||p_organization_id::text,0));
  select * into draft from public.onboarding_drafts where organization_id=p_organization_id and step=p_step for update;
  if p_keep is null or draft.updated_at is distinct from p_expected_updated_at then raise exception 'Draft changed; reload' using errcode='PT409';end if;
  if p_keep then update public.onboarding_drafts set base_revision=private.onboarding_revision(p_organization_id,p_step),updated_by=actor,updated_at=clock_timestamp() where organization_id=p_organization_id and step=p_step;
  else delete from public.onboarding_drafts where organization_id=p_organization_id and step=p_step;end if;
end$$;
create function public.commit_onboarding_step(p_organization_id uuid,p_step text,p_fields jsonb,p_base_revision timestamptz,p_draft_revision timestamptz)
returns smallint language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_onboarding_manager(p_organization_id,p_step);draft public.onboarding_drafts;progress smallint;row jsonb;competitor_id uuid;submitted uuid[]:='{}';begin
  perform pg_advisory_xact_lock(hashtextextended('onboarding:'||p_organization_id::text,0));
  perform private.check_onboarding_value(private.onboarding_schema(p_step),p_fields,false);
  select * into draft from public.onboarding_drafts where organization_id=p_organization_id and step=p_step for update;
  if private.onboarding_revision(p_organization_id,p_step) is distinct from p_base_revision or draft.updated_at is distinct from p_draft_revision or (draft.updated_at is not null and draft.base_revision is distinct from p_base_revision) then raise exception 'Company or draft changed; reload' using errcode='PT409';end if;
  if p_step='company' then
    insert into public.company_profiles(organization_id,company_name,industry,short_description,stage,primary_market,website,instagram,created_by,updated_by) values(p_organization_id,coalesce(p_fields->>'companyName',''),coalesce(p_fields->>'industry',''),coalesce(p_fields->>'shortDescription',''),(p_fields->>'stage')::public.company_stage,nullif(p_fields->>'primaryMarket',''),nullif(p_fields->>'website',''),nullif(p_fields->>'instagram',''),actor,actor) on conflict(organization_id) do update set company_name=excluded.company_name,industry=excluded.industry,short_description=excluded.short_description,stage=excluded.stage,primary_market=excluded.primary_market,website=excluded.website,instagram=excluded.instagram,updated_by=actor;
  elsif p_step='problem' then
    update public.company_profiles set problem_statement=coalesce(p_fields->>'problemStatement',''),startup_idea=coalesce(p_fields->>'startupIdea',''),affected_audience=nullif(p_fields->>'affectedAudience',''),core_insight=nullif(p_fields->>'coreInsight',''),problem_importance=nullif(p_fields->>'problemImportance',''),current_alternatives=array(select jsonb_array_elements_text(p_fields->'currentAlternatives')),updated_by=actor where organization_id=p_organization_id;
    if not found then raise exception 'Save company identity first' using errcode='22023';end if;
  elsif p_step='product' then
    update public.company_profiles set product_concept=coalesce(p_fields->>'productConcept',''),value_proposition=coalesce(p_fields->>'valueProposition',''),product_status=(p_fields->>'productStatus')::public.product_status,core_capabilities=array(select jsonb_array_elements_text(p_fields->'coreCapabilities')),differentiators=array(select jsonb_array_elements_text(p_fields->'differentiators')),near_term_objective=nullif(p_fields->>'nearTermObjective',''),updated_by=actor where organization_id=p_organization_id;
    if not found then raise exception 'Save company identity first' using errcode='22023';end if;
  elsif p_step='audience' then
    insert into public.audience_profiles(id,organization_id,name,description,characteristics,pain_points,goals,motivations,objections,attention_channels,is_primary,created_by,updated_by) values(coalesce((select id from public.audience_profiles where organization_id=p_organization_id and is_primary),gen_random_uuid()),p_organization_id,coalesce(p_fields->>'name',''),coalesce(p_fields->>'description',''),array(select jsonb_array_elements_text(p_fields->'characteristics')),array(select jsonb_array_elements_text(p_fields->'painPoints')),array(select jsonb_array_elements_text(p_fields->'goals')),array(select jsonb_array_elements_text(p_fields->'motivations')),array(select jsonb_array_elements_text(p_fields->'objections')),array(select jsonb_array_elements_text(p_fields->'attentionChannels')),true,actor,actor) on conflict(id) do update set name=excluded.name,description=excluded.description,characteristics=excluded.characteristics,pain_points=excluded.pain_points,goals=excluded.goals,motivations=excluded.motivations,objections=excluded.objections,attention_channels=excluded.attention_channels,is_primary=excluded.is_primary,updated_by=actor;
  elsif p_step='positioning-brand' then
    update public.company_profiles set positioning_category=nullif(p_fields->>'positioningCategory',''),status_quo=nullif(p_fields->>'statusQuo',''),positioning_difference=coalesce(p_fields->>'positioningDifference',''),desired_perception=nullif(p_fields->>'desiredPerception',''),key_promise=nullif(p_fields->>'keyPromise',''),reasons_to_believe=array(select jsonb_array_elements_text(p_fields->'reasonsToBelieve')),updated_by=actor where organization_id=p_organization_id;
    if not found then raise exception 'Save company identity first' using errcode='22023';end if;
    insert into public.brand_profiles(organization_id,status,personality_traits,tone_of_voice,desired_emotions,communication_traits,emphasize,avoid,visual_direction,primary_colors,created_by,updated_by) values(p_organization_id,(p_fields->>'brandStatus')::public.brand_status,array(select jsonb_array_elements_text(p_fields->'personalityTraits')),array(select jsonb_array_elements_text(p_fields->'toneOfVoice')),array(select jsonb_array_elements_text(p_fields->'desiredEmotions')),array(select jsonb_array_elements_text(p_fields->'communicationTraits')),array(select jsonb_array_elements_text(p_fields->'emphasize')),array(select jsonb_array_elements_text(p_fields->'avoid')),nullif(p_fields->>'visualDirection',''),array(select jsonb_array_elements_text(p_fields->'primaryColors')),actor,actor) on conflict(organization_id) do update set status=excluded.status,personality_traits=excluded.personality_traits,tone_of_voice=excluded.tone_of_voice,desired_emotions=excluded.desired_emotions,communication_traits=excluded.communication_traits,emphasize=excluded.emphasize,avoid=excluded.avoid,visual_direction=excluded.visual_direction,primary_colors=excluded.primary_colors,updated_by=actor;
  elsif p_step='marketing' then
    insert into public.marketing_profiles(organization_id,primary_objective,secondary_objectives,primary_channels,content_focus,desired_audience_action,stage,notes,created_by,updated_by) values(p_organization_id,(p_fields->>'primaryObjective')::public.marketing_objective,array(select jsonb_array_elements_text(p_fields->'secondaryObjectives'))::public.marketing_objective[],array(select jsonb_array_elements_text(p_fields->'primaryChannels')),array(select jsonb_array_elements_text(p_fields->'contentFocus')),nullif(p_fields->>'desiredAudienceAction',''),(p_fields->>'marketingStage')::public.marketing_stage,nullif(p_fields->>'notes',''),actor,actor) on conflict(organization_id) do update set primary_objective=excluded.primary_objective,secondary_objectives=excluded.secondary_objectives,primary_channels=excluded.primary_channels,content_focus=excluded.content_focus,desired_audience_action=excluded.desired_audience_action,stage=excluded.stage,notes=excluded.notes,updated_by=actor;
  elsif p_step='competitors' then
    for row in select jsonb_array_elements(p_fields->'competitors') loop
      competitor_id:=coalesce((row->>'id')::uuid,gen_random_uuid());
      if exists(select 1 from public.competitors where id=competitor_id and organization_id<>p_organization_id) then raise exception 'Competitor unavailable' using errcode='42501';end if;
      submitted:=array_append(submitted,competitor_id);
      insert into public.competitors(id,organization_id,name,type,website,instagram,short_description,relevance,created_by,updated_by)
      values(competitor_id,p_organization_id,row->>'name',(row->>'type')::public.competitor_type,nullif(row->>'website',''),nullif(row->>'instagram',''),nullif(row->>'shortDescription',''),nullif(row->>'relevance',''),actor,actor)
      on conflict(id) do update set name=excluded.name,type=excluded.type,website=excluded.website,instagram=excluded.instagram,short_description=excluded.short_description,relevance=excluded.relevance,archived_at=null,updated_by=actor;
    end loop;
    update public.competitors set archived_at=clock_timestamp(),updated_by=actor where organization_id=p_organization_id and archived_at is null and not(id=any(submitted));
  end if;
  select public.advance_onboarding_progress(p_organization_id,array_position(array['company','problem','product','audience','positioning-brand','marketing','competitors'],p_step)::smallint) into progress;
  delete from public.onboarding_drafts where organization_id=p_organization_id and step=p_step;
  return progress;
end$$;
create function public.finish_company_onboarding(p_organization_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_onboarding_manager(p_organization_id,'competitors');begin
  perform pg_advisory_xact_lock(hashtextextended('onboarding:'||p_organization_id::text,0));
  if coalesce((select current_step from public.onboarding_progress where organization_id=p_organization_id),1)<8 or exists(select 1 from public.onboarding_drafts where organization_id=p_organization_id) or
    not exists(select 1 from public.company_profiles where organization_id=p_organization_id and length(btrim(problem_statement))>=10 and length(btrim(startup_idea))>=10 and length(btrim(product_concept))>=10 and length(btrim(value_proposition))>=10 and length(btrim(positioning_difference))>=5) or
    not exists(select 1 from public.audience_profiles where organization_id=p_organization_id and is_primary) or
    not exists(select 1 from public.brand_profiles where organization_id=p_organization_id) or
    not exists(select 1 from public.marketing_profiles where organization_id=p_organization_id and cardinality(primary_channels)>0)
  then raise exception 'Review and save each required step first' using errcode='22023';end if;
  update public.onboarding_progress set completed_at=coalesce(completed_at,clock_timestamp()),updated_by=actor where organization_id=p_organization_id;
end$$;
revoke all on function private.require_onboarding_manager(uuid,text),private.onboarding_revision(uuid,text),private.onboarding_schema(text),private.check_onboarding_value(jsonb,jsonb,boolean),private.check_onboarding_draft(text,jsonb),private.onboarding_revision_tick() from public,anon,authenticated;
revoke all on function public.read_onboarding_draft(uuid,text),public.save_onboarding_draft(uuid,text,jsonb,timestamptz,timestamptz),public.resolve_onboarding_draft(uuid,text,timestamptz,boolean),public.commit_onboarding_step(uuid,text,jsonb,timestamptz,timestamptz),public.finish_company_onboarding(uuid) from public,anon;
grant execute on function public.read_onboarding_draft(uuid,text),public.save_onboarding_draft(uuid,text,jsonb,timestamptz,timestamptz),public.resolve_onboarding_draft(uuid,text,timestamptz,boolean),public.commit_onboarding_step(uuid,text,jsonb,timestamptz,timestamptz),public.finish_company_onboarding(uuid) to authenticated;

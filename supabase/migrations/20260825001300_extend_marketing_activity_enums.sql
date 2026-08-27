alter type public.notification_entity_type add value if not exists 'MARKETING';

alter type public.activity_event_type add value if not exists 'MARKETING_RECORD_CREATED';
alter type public.activity_event_type add value if not exists 'MARKETING_RECORD_UPDATED';
alter type public.activity_event_type add value if not exists 'MARKETING_RECORD_ARCHIVED';
alter type public.activity_event_type add value if not exists 'MARKETING_RECORD_RESTORED';

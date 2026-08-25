alter type public.notification_type add value if not exists 'BOARD_MENTION';
alter type public.notification_entity_type add value if not exists 'BOARD';
alter type public.activity_event_type add value if not exists 'BOARD_COMMENTED';

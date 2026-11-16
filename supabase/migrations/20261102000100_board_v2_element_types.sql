-- Enum additions commit before the following migration uses them.
alter type public.board_element_type add value if not exists 'SECTION';
alter type public.board_element_type add value if not exists 'GROUP';
alter type public.board_element_type add value if not exists 'LINK';

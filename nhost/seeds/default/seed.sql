-- Local/dev seed data: two orgs, each with an owner/editor/viewer, for exercising
-- both permission layers and the final cross-org isolation scenario.
--
-- On Nhost Cloud these auth.users rows would normally come from real signups; this
-- seed inserts directly into auth.users for local testing only (see nhost/migrations
-- .../up.sql — auth.users is only created here if it doesn't already exist).

insert into auth.users (id, email, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'owner-a@example.com', 'Owner A'),
  ('00000000-0000-0000-0000-00000000000b', 'editor-a@example.com', 'Editor A'),
  ('00000000-0000-0000-0000-00000000000c', 'viewer-a@example.com', 'Viewer A'),
  ('00000000-0000-0000-0000-00000000000d', 'owner-b@example.com', 'Owner B'),
  ('00000000-0000-0000-0000-00000000000e', 'editor-b@example.com', 'Editor B')
on conflict (id) do nothing;

insert into public.organizations (id, name, quota_calls_used, quota_calls_allowed) values
  ('10000000-0000-0000-0000-00000000000a', 'Org A', 0, 1000),
  ('10000000-0000-0000-0000-00000000000b', 'Org B', 0, 1000)
on conflict (id) do nothing;

insert into public.org_members (org_id, user_id, role) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'owner'),
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', 'editor'),
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000c', 'viewer'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000d', 'owner'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000e', 'editor')
on conflict (org_id, user_id) do nothing;

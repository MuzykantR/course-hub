-- Outcome of the last GitHub export, shown on the admin settings page.
alter table public.settings
  add column github_last_export_at timestamptz,
  add column github_last_export_ok boolean,
  add column github_last_export_message text check (char_length(github_last_export_message) <= 2000),
  add column github_last_commit_url text check (char_length(github_last_commit_url) <= 500);

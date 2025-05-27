-- Allow inserts from backend functions (trigger runs as service role)
create policy "Allow service role insert"
  on users
  for insert
  to service_role
  using (true)
  with check (true);

-- Fix permissive policies: restrict service-level inserts to authenticated or service role
drop policy "Service can insert flags" on public.transaction_flags;
drop policy "Service can upsert prices" on public.price_feed;
drop policy "Service can update prices" on public.price_feed;

-- Transaction flags: only admins can insert
create policy "Admins can insert flags" on public.transaction_flags for insert with check (public.has_role(auth.uid(), 'admin'));

-- Price feed: only admins can modify (edge functions use service_role key which bypasses RLS)
create policy "Admins can insert prices" on public.price_feed for insert with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins can update prices" on public.price_feed for update using (public.has_role(auth.uid(), 'admin'));

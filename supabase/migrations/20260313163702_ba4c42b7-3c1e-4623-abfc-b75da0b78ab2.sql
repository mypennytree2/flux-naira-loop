
-- ─── APP ROLE ENUM ─────────────────────────────────────
create type public.app_role as enum ('admin', 'user');

-- ─── PROFILES ──────────────────────────────────────────
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  email text unique,
  phone text unique,
  bvn text,
  bvn_verified boolean default false,
  nin text,
  nin_verified boolean default false,
  kyc_tier integer default 0,
  kyc_status text default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- ─── USER ROLES ────────────────────────────────────────
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create policy "Users can view own roles" on public.user_roles for select using (auth.uid() = user_id);

-- Security definer function
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- ─── WALLETS ───────────────────────────────────────────
create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade unique not null,
  ngn_balance numeric default 0,
  ngn_account_number text unique,
  ngn_account_name text,
  ngn_bank_name text default 'Flux MFB',
  ngn_bank_code text default '090XXX',
  crypto_deposit_address text unique,
  crypto_deposit_address_solana text unique,
  crypto_deposit_address_xrp text unique,
  created_at timestamptz default now()
);

alter table public.wallets enable row level security;

create policy "Users can view own wallet" on public.wallets for select using (auth.uid() = user_id);
create policy "Users can update own wallet" on public.wallets for update using (auth.uid() = user_id);
create policy "Users can insert own wallet" on public.wallets for insert with check (auth.uid() = user_id);

-- ─── COLLATERAL DEPOSITS ───────────────────────────────
create table public.collateral_deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  loan_id uuid,
  asset text not null,
  amount numeric not null,
  amount_usd numeric,
  amount_ngn numeric,
  tx_hash text,
  network text,
  status text default 'pending',
  confirmations_required integer,
  confirmations_received integer default 0,
  smart_contract_id text,
  locked_at timestamptz,
  released_at timestamptz,
  created_at timestamptz default now()
);

alter table public.collateral_deposits enable row level security;

create policy "Users can view own deposits" on public.collateral_deposits for select using (auth.uid() = user_id);
create policy "Users can insert own deposits" on public.collateral_deposits for insert with check (auth.uid() = user_id);
create policy "Users can update own deposits" on public.collateral_deposits for update using (auth.uid() = user_id);

-- ─── LOANS ─────────────────────────────────────────────
create table public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  collateral_deposit_id uuid references public.collateral_deposits(id),
  collateral_asset text not null,
  collateral_amount numeric not null,
  collateral_value_ngn numeric not null,
  loan_amount_ngn numeric not null,
  origination_fee_ngn numeric not null,
  net_disbursed_ngn numeric not null,
  daily_rate numeric default 0.0015,
  max_ltv numeric not null,
  outstanding_principal_ngn numeric not null,
  accrued_interest_ngn numeric default 0,
  total_outstanding_ngn numeric not null,
  current_ltv numeric,
  margin_call_ltv numeric,
  liquidation_ltv numeric,
  margin_call_triggered boolean default false,
  margin_call_triggered_at timestamptz,
  fx_volatility_flag boolean default false,
  fx_adjusted_margin_call_ltv numeric,
  status text default 'pending_approval',
  approval_type text,
  approved_at timestamptz,
  approval_tat_minutes integer,
  disbursed_at timestamptz,
  repaid_at timestamptz,
  lending_license_ref text default 'CBN/LIC/MFB/2024/FLUX',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.loans enable row level security;

create policy "Users can view own loans" on public.loans for select using (auth.uid() = user_id);
create policy "Users can insert own loans" on public.loans for insert with check (auth.uid() = user_id);
create policy "Users can update own loans" on public.loans for update using (auth.uid() = user_id);
create policy "Admins can view all loans" on public.loans for select using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can update all loans" on public.loans for update using (public.has_role(auth.uid(), 'admin'));

-- ─── LOAN REPAYMENTS ───────────────────────────────────
create table public.loan_repayments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid references public.loans(id) not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount_ngn numeric not null,
  principal_portion numeric,
  interest_portion numeric,
  payment_method text default 'wallet_debit',
  status text default 'completed',
  created_at timestamptz default now()
);

alter table public.loan_repayments enable row level security;

create policy "Users can view own repayments" on public.loan_repayments for select using (auth.uid() = user_id);
create policy "Users can insert own repayments" on public.loan_repayments for insert with check (auth.uid() = user_id);

-- ─── NIP TRANSFERS ─────────────────────────────────────
create table public.nip_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount_ngn numeric not null,
  recipient_account_number text not null,
  recipient_bank_code text not null,
  recipient_bank_name text,
  recipient_account_name text,
  narration text,
  status text default 'pending',
  nip_session_id text,
  nip_response_code text,
  fee_ngn numeric default 50,
  created_at timestamptz default now(),
  completed_at timestamptz
);

alter table public.nip_transfers enable row level security;

create policy "Users can view own transfers" on public.nip_transfers for select using (auth.uid() = user_id);
create policy "Users can insert own transfers" on public.nip_transfers for insert with check (auth.uid() = user_id);
create policy "Users can update own transfers" on public.nip_transfers for update using (auth.uid() = user_id);

-- ─── TRANSACTION FLAGS ─────────────────────────────────
create table public.transaction_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  entity_type text,
  entity_id uuid,
  flag_type text,
  flag_severity text,
  flag_details jsonb,
  reviewed boolean default false,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

alter table public.transaction_flags enable row level security;

create policy "Admins can view all flags" on public.transaction_flags for select using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can update flags" on public.transaction_flags for update using (public.has_role(auth.uid(), 'admin'));
create policy "Service can insert flags" on public.transaction_flags for insert with check (true);

-- ─── PRICE FEED ────────────────────────────────────────
create table public.price_feed (
  asset text primary key,
  price_usd numeric,
  price_ngn numeric,
  change_24h_pct numeric,
  volatility_24h_pct numeric,
  updated_at timestamptz default now()
);

alter table public.price_feed enable row level security;

create policy "Price feed is public read" on public.price_feed for select using (true);
create policy "Service can upsert prices" on public.price_feed for insert with check (true);
create policy "Service can update prices" on public.price_feed for update using (true);

-- ─── HELPER FUNCTION ───────────────────────────────────
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

create trigger update_profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at_column();

create trigger update_loans_updated_at before update on public.loans
  for each row execute function public.update_updated_at_column();

-- ─── AUTO-CREATE PROFILE ON SIGNUP ─────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── SEED PRICE FEED ──────────────────────────────────
insert into public.price_feed (asset, price_usd, price_ngn, change_24h_pct, volatility_24h_pct) values
  ('USDC', 1.00, 1620, 0.01, 0.1),
  ('USDT', 1.00, 1620, -0.02, 0.1),
  ('cNGN', 0.000617, 1.00, 0.0, 0.0),
  ('BTC', 67500, 109350000, 2.5, 4.2),
  ('ETH', 3450, 5589000, 1.8, 5.1),
  ('SOL', 148, 239760, 3.2, 7.8),
  ('XRP', 0.62, 1004.4, -1.5, 6.3),
  ('BNB', 580, 939600, 0.8, 3.9);

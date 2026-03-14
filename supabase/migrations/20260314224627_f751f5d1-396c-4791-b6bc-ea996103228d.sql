
-- ─── LOAN EVENTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.loan_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id      UUID NOT NULL REFERENCES public.loans(id),
  event_type   TEXT NOT NULL,
  description  TEXT NOT NULL,
  metadata     JSONB,
  txn_hash     TEXT,
  signers      TEXT[],
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loan_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loan events" ON public.loan_events
FOR SELECT USING (
  loan_id IN (SELECT id FROM public.loans WHERE user_id = (SELECT id FROM public.profiles WHERE id = auth.uid()))
);

CREATE POLICY "Admins can view all loan events" ON public.loan_events
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert loan events" ON public.loan_events
FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ─── KYC SUBMISSIONS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.kyc_submissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id),
  tier         INT NOT NULL,
  bvn          TEXT,
  nin          TEXT,
  id_type      TEXT,
  id_url       TEXT,
  selfie_url   TEXT,
  status       TEXT NOT NULL DEFAULT 'pending',
  reviewed_by  UUID REFERENCES public.profiles(id),
  reviewed_at  TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own kyc" ON public.kyc_submissions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own kyc" ON public.kyc_submissions
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all kyc" ON public.kyc_submissions
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update kyc" ON public.kyc_submissions
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- ─── EXCHANGE CORRIDORS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exchange_corridors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency   TEXT NOT NULL,
  to_currency     TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT FALSE,
  spread_pct      NUMERIC(6,4) NOT NULL DEFAULT 0.8,
  min_amount      NUMERIC(18,2) NOT NULL,
  max_daily       NUMERIC(18,2) NOT NULL,
  avg_daily_vol   NUMERIC(18,2) NOT NULL DEFAULT 0,
  vol_threshold   NUMERIC(18,2) NOT NULL DEFAULT 500000,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.exchange_corridors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Exchange corridors public read" ON public.exchange_corridors
FOR SELECT USING (true);

-- ─── B2B PARTNERS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.b2b_partners (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  api_key_hash   TEXT NOT NULL,
  pricing_model  TEXT NOT NULL DEFAULT 'revenue_share',
  revenue_share  NUMERIC(6,4) DEFAULT 0.25,
  status         TEXT NOT NULL DEFAULT 'sandbox',
  total_loans    INT NOT NULL DEFAULT 0,
  total_volume   NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.b2b_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage b2b partners" ON public.b2b_partners
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime on loans and wallets
ALTER PUBLICATION supabase_realtime ADD TABLE public.loans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;

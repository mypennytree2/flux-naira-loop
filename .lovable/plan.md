

# FLUX — Crypto-Backed Lending Platform MVP

## Overview
A regulated crypto-backed lending platform for Nigeria. Users deposit crypto collateral, receive Naira instantly into a virtual account, and can send Naira via NIP bank transfer. Dark-themed, mobile-first, extremely clean UI.

## Tech & Design
- React + TypeScript + Tailwind + shadcn/ui + Framer Motion
- Lovable Cloud (Supabase) for auth, database, realtime, edge functions
- Fonts: **Syne** (headings/numbers) + **DM Sans** (body)
- Dark theme only with accent (#00d4a1), gold (#f0b429), red (#ff6b6b)
- **Security fix**: Replace `is_admin` on profiles with a separate `user_roles` table using `has_role()` security definer function

---

## Database Setup (Lovable Cloud)

Create all tables as specified in the prompt:
- `profiles` (without `is_admin` — use `user_roles` table instead)
- `wallets`, `collateral_deposits`, `loans`, `loan_repayments`
- `nip_transfers`, `transaction_flags`, `price_feed`
- `user_roles` table with `app_role` enum (`admin`, `user`)
- RLS policies: users access own data; admins (via `has_role()`) access flags and all loans
- `price_feed` is public read

---

## Pages & Features

### 1. Auth (`/`)
- Split-screen layout: left = branding ("Borrow Naira. Keep your crypto."), right = sign in/sign up form
- Sign up creates auth user + profile row, redirects to `/onboarding`
- Sign in redirects to `/dashboard`

### 2. Onboarding (`/onboarding`) — 3-step wizard
- **Step 1**: BVN + NIN + DOB entry (mock verification → sets `kyc_tier=1`, `kyc_status='approved'`)
- **Step 2**: Loading animation → reveal provisioned virtual account + crypto deposit addresses (mock generated, saved to `wallets`)
- **Step 3**: Compliance notice + checkbox agreement → redirect to `/dashboard`

### 3. Dashboard (`/dashboard`)
- **Wallet balance**: Large ₦ display, account details, "Send Money" + "Borrow" CTAs
- **Active loans**: Cards with collateral badge, outstanding balance, live LTV health dot (green/amber/red), daily interest ticking up. Margin call warning banner when triggered
- **Quick stats**: Total collateral locked, total interest paid, days since first loan
- Empty state if no loans

### 4. Borrow (`/borrow`) — 3-step flow
- **Step 1**: Asset grid (8 cards) with live prices, max LTV badge, volatility indicator
- **Step 2**: Amount input with live calculation panel (collateral value, max borrow, origination fee, net disbursed, daily interest, margin call threshold). LTV slider. FX volatility warning when applicable
- **Step 3**: Review summary → confirm. Instant approval (<₦10M, tier 1) credits wallet in 3s with confetti. Manual approval shows "under review" message

### 5. Loan Detail (`/loans/:id`)
- Animated LTV health bar (accent→gold→red)
- Outstanding balance with live interest accrual (updates every 60s)
- Repayment input → debit wallet, update loan, release collateral if fully repaid
- Collateral info with mock smart contract reference and block explorer link
- FX volatility callout when active

### 6. Wallet (`/wallet`)
- Balance + account number with copy button
- **Send Money**: 3-step (recipient details with mock NIP name enquiry → amount + narration → confirm). Deducts balance, simulates processing (5s), shows success/failure
- Transfer history with status badges

### 7. Admin (`/admin`) — role-gated via `user_roles` table
- **Pending manual loans**: Approve/reject buttons
- **Transaction flags**: Table with review capability
- **Active loans overview**: All loans with live LTV status, highlighted margin calls
- **KYC queue**: Users with `kyc_status = 'under_review'`

---

## Edge Functions

1. **provision-wallet**: Creates mock virtual account number + crypto deposit addresses on KYC approval
2. **update-prices**: Fetches CoinGecko prices, upserts into `price_feed` (called on interval; cNGN hardcoded at ₦1)
3. **monitor-transaction**: Runs AML/monitoring rules on loan creation, repayment, and NIP transfers; inserts flags

---

## Core Business Logic (Client-side utilities)
- `COLLATERAL_ASSETS` constant with all 8 assets and their LTV/margin/liquidation thresholds
- Interest calculation: 0.15%/day flat rate
- LTV calculation with FX volatility adjustment (tighten thresholds when 24h vol > 5%)
- Loan approval TAT: instant (<₦10M + tier 1) vs manual review
- Origination fee: 1% deducted at disbursement

---

## Real-time & Data
- Supabase Realtime subscriptions on `wallets` and `loans` tables
- React Query with 30s refetch on price data
- Live currency formatting as user types
- LTV bar recalculates every 60s from latest `price_feed`

## Mobile
- Single column layout with bottom navigation: Home · Borrow · Wallet
- All flows fully responsive


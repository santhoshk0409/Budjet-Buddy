-- ==========================================================
-- WALLET BUDDY - SUPABASE POSTGRESQL DATABASE SCHEMA
-- ==========================================================

-- 1. Create Profiles Table (Users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Create Wallets Table
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  budget_amount NUMERIC(12, 2) DEFAULT 0,
  spent_amount NUMERIC(12, 2) DEFAULT 0,
  remaining_amount NUMERIC(12, 2) DEFAULT 0,
  color TEXT DEFAULT '#3b82f6',
  icon TEXT DEFAULT 'Utensils',
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallets" ON public.wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallets" ON public.wallets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wallets" ON public.wallets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own wallets" ON public.wallets
  FOR DELETE USING (auth.uid() = user_id);

-- 3. Create Expense Types (Categories) Table
CREATE TABLE IF NOT EXISTS public.expense_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'Tag',
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.expense_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expense types" ON public.expense_types
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expense types" ON public.expense_types
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expense types" ON public.expense_types
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expense types" ON public.expense_types
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Create Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE NOT NULL,
  expense_type_id UUID REFERENCES public.expense_types(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time TIME NOT NULL DEFAULT CURRENT_TIME,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expenses" ON public.expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses" ON public.expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses" ON public.expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses" ON public.expenses
  FOR DELETE USING (auth.uid() = user_id);

-- 5. Create Budget Reset Logs Table
CREATE TABLE IF NOT EXISTS public.budget_reset_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month_key TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.budget_reset_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own reset logs" ON public.budget_reset_logs
  FOR ALL USING (auth.uid() = user_id);

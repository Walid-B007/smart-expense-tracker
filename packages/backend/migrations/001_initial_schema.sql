-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  default_currency TEXT DEFAULT 'USD',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accounts table
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('checking', 'savings', 'credit_card', 'investment', 'cash', 'other')),
  currency TEXT NOT NULL DEFAULT 'USD',
  initial_balance NUMERIC(15, 2) DEFAULT 0,
  current_balance NUMERIC(15, 2) DEFAULT 0,
  institution TEXT,
  account_number TEXT,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  category_type TEXT NOT NULL CHECK (category_type IN ('income', 'expense', 'transfer')),
  icon TEXT,
  color TEXT,
  is_system BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for hierarchical queries
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_user_id ON categories(user_id);

-- Transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('debit', 'credit')),
  merchant_name TEXT,
  reference_number TEXT,
  notes TEXT,
  tags TEXT[],
  is_reconciled BOOLEAN DEFAULT false,
  is_recurring BOOLEAN DEFAULT false,
  import_job_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX idx_transactions_merchant ON transactions(merchant_name);

-- Category suggestions from LLM
CREATE TABLE category_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  confidence_score NUMERIC(3, 2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  llm_provider TEXT NOT NULL,
  llm_model TEXT NOT NULL,
  prompt_hash TEXT,
  response_data JSONB,
  is_accepted BOOLEAN DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_category_suggestions_transaction_id ON category_suggestions(transaction_id);
CREATE INDEX idx_category_suggestions_confidence ON category_suggestions(confidence_score DESC);

-- Transfers between accounts
CREATE TABLE transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  to_transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  from_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  to_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  transfer_date DATE NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  currency TEXT NOT NULL,
  fx_rate NUMERIC(15, 6),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_transaction_id, to_transaction_id)
);

CREATE INDEX idx_transfers_user_id ON transfers(user_id);
CREATE INDEX idx_transfers_from_transaction ON transfers(from_transaction_id);
CREATE INDEX idx_transfers_to_transaction ON transfers(to_transaction_id);

-- Foreign exchange rates
CREATE TABLE fx_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rate_date DATE NOT NULL,
  base_currency TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  rate NUMERIC(15, 6) NOT NULL,
  provider TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rate_date, base_currency, target_currency)
);

CREATE INDEX idx_fx_rates_date ON fx_rates(rate_date DESC);
CREATE INDEX idx_fx_rates_currencies ON fx_rates(base_currency, target_currency);

-- Import jobs tracking
CREATE TABLE import_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('csv', 'xlsx')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'mapping', 'validating', 'importing', 'completed', 'failed')),
  total_rows INTEGER DEFAULT 0,
  imported_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  column_mapping JSONB,
  validation_errors JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_import_jobs_user_id ON import_jobs(user_id);
CREATE INDEX idx_import_jobs_status ON import_jobs(status);

-- Import rows (staging area)
CREATE TABLE import_rows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  import_job_id UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  raw_data JSONB NOT NULL,
  parsed_data JSONB,
  validation_status TEXT CHECK (validation_status IN ('pending', 'valid', 'invalid', 'warning')),
  validation_errors JSONB DEFAULT '[]',
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_import_rows_job_id ON import_rows(import_job_id);
CREATE INDEX idx_import_rows_status ON import_rows(validation_status);

-- Merchant normalization/enrichment
CREATE TABLE merchant_normalization (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  raw_merchant_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  merchant_category_code TEXT,
  logo_url TEXT,
  website TEXT,
  confidence_score NUMERIC(3, 2),
  source TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_merchant_norm_raw_name ON merchant_normalization(raw_merchant_name);
CREATE INDEX idx_merchant_norm_normalized ON merchant_normalization(normalized_name);

-- Recurring transactions patterns
CREATE TABLE recurring_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pattern_name TEXT NOT NULL,
  merchant_name TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  expected_amount NUMERIC(15, 2),
  amount_tolerance NUMERIC(15, 2) DEFAULT 5.00,
  last_occurrence_date DATE,
  next_expected_date DATE,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recurring_patterns_user_id ON recurring_patterns(user_id);

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_normalization ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_patterns ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Accounts policies
CREATE POLICY "Users can view own accounts" ON accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own accounts" ON accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own accounts" ON accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own accounts" ON accounts FOR DELETE USING (auth.uid() = user_id);

-- Categories policies
CREATE POLICY "Users can view categories" ON categories FOR SELECT USING (auth.uid() = user_id OR is_system = true);
CREATE POLICY "Users can insert own categories" ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON categories FOR DELETE USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON transactions FOR DELETE USING (auth.uid() = user_id);

-- Category suggestions policies
CREATE POLICY "Users can view own suggestions" ON category_suggestions FOR SELECT
  USING (EXISTS (SELECT 1 FROM transactions WHERE transactions.id = category_suggestions.transaction_id AND transactions.user_id = auth.uid()));

-- Transfers policies
CREATE POLICY "Users can view own transfers" ON transfers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own transfers" ON transfers FOR ALL USING (auth.uid() = user_id);

-- Import jobs policies
CREATE POLICY "Users can view own imports" ON import_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own imports" ON import_jobs FOR ALL USING (auth.uid() = user_id);

-- Import rows policies
CREATE POLICY "Users can view own import rows" ON import_rows FOR SELECT
  USING (EXISTS (SELECT 1 FROM import_jobs WHERE import_jobs.id = import_rows.import_job_id AND import_jobs.user_id = auth.uid()));

-- Merchant normalization (read-only for users, managed by system)
CREATE POLICY "Users can view merchant data" ON merchant_normalization FOR SELECT USING (true);

-- Recurring patterns policies
CREATE POLICY "Users can manage own patterns" ON recurring_patterns FOR ALL USING (auth.uid() = user_id);

-- FX rates are public read-only
ALTER TABLE fx_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view fx rates" ON fx_rates FOR SELECT USING (true);

-- Functions and Triggers

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transfers_updated_at BEFORE UPDATE ON transfers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_import_jobs_updated_at BEFORE UPDATE ON import_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_merchant_norm_updated_at BEFORE UPDATE ON merchant_normalization FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recurring_patterns_updated_at BEFORE UPDATE ON recurring_patterns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update account balance on transaction insert/update/delete
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE accounts
    SET current_balance = current_balance +
      CASE
        WHEN NEW.transaction_type = 'credit' THEN NEW.amount
        ELSE -NEW.amount
      END
    WHERE id = NEW.account_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Revert old transaction
    UPDATE accounts
    SET current_balance = current_balance -
      CASE
        WHEN OLD.transaction_type = 'credit' THEN OLD.amount
        ELSE -OLD.amount
      END
    WHERE id = OLD.account_id;

    -- Apply new transaction
    UPDATE accounts
    SET current_balance = current_balance +
      CASE
        WHEN NEW.transaction_type = 'credit' THEN NEW.amount
        ELSE -NEW.amount
      END
    WHERE id = NEW.account_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE accounts
    SET current_balance = current_balance -
      CASE
        WHEN OLD.transaction_type = 'credit' THEN OLD.amount
        ELSE -OLD.amount
      END
    WHERE id = OLD.account_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_balance_on_transaction
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_account_balance();

-- Prevent double-counting for transfers
CREATE OR REPLACE FUNCTION check_transfer_category()
RETURNS TRIGGER AS $$
BEGIN
  -- Transactions linked to transfers should use transfer category
  IF EXISTS (
    SELECT 1 FROM transfers
    WHERE from_transaction_id = NEW.id OR to_transaction_id = NEW.id
  ) THEN
    -- Ensure category is a transfer type
    IF NEW.category_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM categories
        WHERE id = NEW.category_id AND category_type = 'transfer'
      ) THEN
        RAISE EXCEPTION 'Transaction linked to transfer must use transfer category';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_transaction_transfer_category
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION check_transfer_category();

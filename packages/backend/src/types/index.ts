export interface User {
  id: string;
  email: string;
  display_name?: string;
  default_currency: string;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  account_type: 'checking' | 'savings' | 'credit_card' | 'investment' | 'cash' | 'other';
  currency: string;
  initial_balance: number;
  current_balance: number;
  institution?: string;
  account_number?: string;
  is_active: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id?: string;
  name: string;
  parent_id?: string;
  category_type: 'income' | 'expense' | 'transfer';
  icon?: string;
  color?: string;
  is_system: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id?: string;
  transaction_date: string;
  description: string;
  amount: number;
  currency: string;
  transaction_type: 'debit' | 'credit';
  merchant_name?: string;
  reference_number?: string;
  notes?: string;
  tags?: string[];
  is_reconciled: boolean;
  is_recurring: boolean;
  import_job_id?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CategorySuggestion {
  id: string;
  transaction_id: string;
  category_id: string;
  confidence_score: number;
  llm_provider: string;
  llm_model: string;
  prompt_hash?: string;
  response_data?: Record<string, any>;
  is_accepted?: boolean;
  created_at: string;
}

export interface Transfer {
  id: string;
  user_id: string;
  from_transaction_id: string;
  to_transaction_id: string;
  from_account_id: string;
  to_account_id: string;
  transfer_date: string;
  amount: number;
  currency: string;
  fx_rate?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FXRate {
  id: string;
  rate_date: string;
  base_currency: string;
  target_currency: string;
  rate: number;
  provider: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ImportJob {
  id: string;
  user_id: string;
  account_id?: string;
  filename: string;
  file_type: 'csv' | 'xlsx';
  status: 'pending' | 'mapping' | 'validating' | 'importing' | 'completed' | 'failed';
  total_rows: number;
  imported_rows: number;
  failed_rows: number;
  column_mapping?: Record<string, string>;
  validation_errors: any[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ImportRow {
  id: string;
  import_job_id: string;
  row_number: number;
  raw_data: Record<string, any>;
  parsed_data?: Record<string, any>;
  validation_status: 'pending' | 'valid' | 'invalid' | 'warning';
  validation_errors: any[];
  transaction_id?: string;
  created_at: string;
}

export interface MerchantNormalization {
  id: string;
  raw_merchant_name: string;
  normalized_name: string;
  category_id?: string;
  merchant_category_code?: string;
  logo_url?: string;
  website?: string;
  confidence_score?: number;
  source?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface RecurringPattern {
  id: string;
  user_id: string;
  pattern_name: string;
  merchant_name?: string;
  category_id?: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  expected_amount?: number;
  amount_tolerance?: number;
  last_occurrence_date?: string;
  next_expected_date?: string;
  is_active: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Request/Response types
export interface CreateAccountRequest {
  name: string;
  account_type: Account['account_type'];
  currency: string;
  initial_balance?: number;
  institution?: string;
  account_number?: string;
}

export interface CreateTransactionRequest {
  account_id: string;
  category_id?: string;
  transaction_date: string;
  description: string;
  amount: number;
  currency?: string;
  transaction_type: Transaction['transaction_type'];
  merchant_name?: string;
  reference_number?: string;
  notes?: string;
  tags?: string[];
}

export interface FileUploadData {
  filename: string;
  mimetype: string;
  data: Buffer;
}

export interface ColumnMapping {
  date: string;
  description: string;
  amount: string;
  currency?: string;
  transaction_type?: string;
  reference?: string;
}

export interface TransactionFilter {
  account_id?: string;
  category_id?: string;
  start_date?: string;
  end_date?: string;
  min_amount?: number;
  max_amount?: number;
  search?: string;
  transaction_type?: Transaction['transaction_type'];
}

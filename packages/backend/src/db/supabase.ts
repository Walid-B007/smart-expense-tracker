import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

export const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export const supabaseAdmin = supabase;

// Client-side supabase (with anon key for public operations)
export const supabaseClient = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_ANON_KEY
);

export type Database = {
  public: {
    Tables: {
      users: any;
      accounts: any;
      transactions: any;
      categories: any;
      category_suggestions: any;
      transfers: any;
      fx_rates: any;
      import_jobs: any;
      import_rows: any;
      merchant_normalization: any;
      recurring_patterns: any;
    };
  };
};

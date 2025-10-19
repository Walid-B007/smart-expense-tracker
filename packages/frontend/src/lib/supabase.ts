import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sukwpepcvclzfipkrmzn.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1a3dwZXBjdmNsemZpcGtybXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5ODE3ODksImV4cCI6MjA3NTU1Nzc4OX0.SMnjrlXA1iG9Z9QkUeRwxAs_hsLsVHtYwZqZCIBLpdI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

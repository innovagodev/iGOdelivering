// In futuro useremo: import { createClient } from '@supabase/supabase-js';

// Per ora esportiamo un placeholder che configureremo con le tue API Key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Mock del client fino all'installazione della dipendenza ufficiale
export const supabase = {
  // placeholder
  auth: {},
  from: () => ({}),
};

/**
 * Nota: Quando sarai pronto, installeremo @supabase/supabase-js
 * e sostituiremo questo mock con il client reale:
 *
 * export const supabase = createClient(supabaseUrl, supabaseAnonKey);
 */

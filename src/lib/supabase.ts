/**
 * Supabase configuration entry point.
 *
 * - For Client Components: import { createClient } from '@/lib/supabase/client';
 * - For Server Components / Route Handlers: import { createClient } from '@/lib/supabase/server';
 */

export { createClient as createBrowserClient } from '@supabase/ssr';
export { createClient as createServerClient } from '@supabase/ssr';

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com service role — USO EXCLUSIVO no servidor (API routes, jobs).
 * Bypassa RLS. Nunca importe em componentes client.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

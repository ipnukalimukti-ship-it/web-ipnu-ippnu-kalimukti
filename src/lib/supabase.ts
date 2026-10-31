import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** true kalau Supabase belum diisi. Website lalu memakai data contoh. */
export const isDemo = !url || !key;

let client: SupabaseClient | null = null;

/** Klien Supabase untuk membaca data publik. Null di mode demo. */
export function getSupabase(): SupabaseClient | null {
  if (isDemo) return null;
  if (!client) {
    client = createClient(url as string, key as string, {
      auth: { persistSession: false },
    });
  }
  return client;
}

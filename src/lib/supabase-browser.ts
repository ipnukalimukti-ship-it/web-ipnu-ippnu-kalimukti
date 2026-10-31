"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

/**
 * Klien Supabase untuk halaman admin (jalan di browser, menyimpan sesi login).
 * Keamanan data dijaga oleh aturan RLS di database, bukan oleh kode ini.
 * Null kalau Supabase belum disambungkan.
 */
export function getBrowserDb(): SupabaseClient | null {
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}

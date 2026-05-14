/**
 * Supabase singleton client (browser).
 * Las credenciales vienen del .env como variables VITE_* (públicas por diseño).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  // No usamos throw para no romper el bundle si alguien construye sin .env;
  // las llamadas fallarán explícitamente más adelante con mensaje claro.
  console.error(
    "[supabase] Falta VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env. " +
      "Las llamadas a Supabase fallarán hasta que las configures.",
  );
}

export const supabase: SupabaseClient<Database> = createClient<Database>(
  url ?? "http://invalid.local",
  anonKey ?? "invalid",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
    },
  },
);

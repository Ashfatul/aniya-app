import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server client for RSC, route handlers, and server actions.
 * Reads/writes the auth cookie via next/headers.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // RSC context — ignore; the proxy will refresh.
          }
        },
      },
    }
  );
}
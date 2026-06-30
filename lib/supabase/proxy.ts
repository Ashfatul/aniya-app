import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every request.
 * - Reads cookies from the request
 * - Calls getUser() to validate/refresh the session
 * - Writes updated cookies back to the response
 *
 * Skips /login and /signup so the auth pages and the signup server-action
 * POST never get blocked behind a token-refresh racing with the just-set
 * cookies from the action (this was the "still loading" hang on signup).
 */
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Auth pages + their server actions: do not intercept the session here.
  // The signup server action sets cookies itself and then redirects; running
  // getUser() again on that 302 was the source of the hang.
  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/")
  ) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: getUser() MUST be called — it triggers token refresh.
  // Don't use getSession() here; it's not secure on the server.
  // If getUser() throws (e.g. invalid refresh token), let the request
  // continue unauthenticated; the page-level role-gate will redirect.
  try {
    await supabase.auth.getUser();
  } catch {
    // Swallow: auth is enforced downstream. Don't 500 the whole request.
  }

  return supabaseResponse;
}
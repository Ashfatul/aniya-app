import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Runs on every request — keeps the Supabase auth cookie fresh.
 * Renamed from middleware.ts to proxy.ts in Next.js 16.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Skip static assets and Next.js internals.
     * Matches everything except: _next, images, favicon, public assets.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
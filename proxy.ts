import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  type CookieSetOptions = Parameters<typeof response.cookies.set>[2];
  type CookieToSet = { name: string; value: string; options?: CookieSetOptions };

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh the session if needed and attach updated cookies to response.
  await supabase.auth.getSession();

  return response;
}

export const config = {
  matcher: ["/app/:path*", "/auth/:path*", "/dashboard/:path*", "/settings/:path*"],
};

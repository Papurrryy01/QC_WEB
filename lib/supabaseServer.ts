import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function parseCookieHeader(cookieHeader: string) {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const eqIndex = part.indexOf("=");
      if (eqIndex === -1) {
        return { name: part, value: "" };
      }
      return {
        name: part.slice(0, eqIndex),
        value: part.slice(eqIndex + 1),
      };
    });
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  type CookieSetOptions = Parameters<typeof cookieStore.set>[2];
  type CookieToSet = { name: string; value: string; options?: CookieSetOptions };

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          if (typeof cookieStore.getAll === "function") return cookieStore.getAll();
          if (typeof cookieStore.toString === "function") {
            const cookieHeader = cookieStore.toString();
            return cookieHeader ? parseCookieHeader(cookieHeader) : [];
          }
          return [];
        },
        setAll(cookiesToSet: CookieToSet[]) {
          // In Server Components, cookies are read-only. Ignore set attempts there.
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options);
            } catch {
              // no-op
            }
          });
        },
      },
    }
  );
}

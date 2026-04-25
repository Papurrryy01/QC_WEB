import { createClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";

export async function getSupabaseAuthServer() {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const authHeader = headerStore.get("authorization");

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Cookie: cookieStore.toString(),
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
      },
      auth: {
        persistSession: false,
      },
    }
  );
}

import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { readProfileFromUserMetadata } from "@/lib/profileFallback";
import AppNavigation from "./AppNavigation";
import RememberSessionGuard from "./RememberSessionGuard";
import CalendarFab from "./CalendarFab";
import AppFooter from "@/app/components/footer/AppFooter";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const email = user.email ?? "QC account";
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  const fallbackProfile = readProfileFromUserMetadata(user);
  const resolvedProfile = profile ?? fallbackProfile;

  const fallbackName = email.split("@")[0] ?? "qc";
  const displayName = resolvedProfile.display_name?.trim() || fallbackName;
  const monogram = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="qc-app-shell">
      <RememberSessionGuard />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-10rem] top-[-9rem] h-[30rem] w-[30rem] rounded-full bg-[rgba(41,90,201,0.18)] blur-[110px]" />
        <div className="absolute bottom-[-10rem] right-[-8rem] h-[30rem] w-[30rem] rounded-full bg-[rgba(124,137,158,0.2)] blur-[120px]" />
      </div>

      <AppNavigation
        email={email}
        monogram={monogram}
        displayName={displayName}
        username={resolvedProfile.username ?? null}
        avatarUrl={resolvedProfile.avatar_url ?? null}
      />

      <main className="qc-app-main">{children}</main>
      <AppFooter />
      <CalendarFab />
    </div>
  );
}

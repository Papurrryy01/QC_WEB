import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { readProfileFromUserMetadata } from "@/lib/profileFallback";
import SettingsWorkspace, { type SettingsPanel } from "./SettingsWorkspace";

function resolvePanel(panel: string | undefined): SettingsPanel {
  if (panel === "notifications") return "notifications";
  if (panel === "security") return "security";
  if (panel === "delivery") return "delivery";
  if (panel === "legal") return "legal";
  if (panel === "permissions") return "permissions";
  return "profile";
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ panel?: string }>;
}) {
  const params = await searchParams;
  const panel = resolvePanel(params.panel);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, avatar_url, bio, phone, timezone")
    .eq("id", user.id)
    .maybeSingle();

  const fallbackProfile = readProfileFromUserMetadata(user);
  const resolvedProfile = profile ?? fallbackProfile;

  const email = user.email ?? "QC account";
  const fallbackName = email.split("@")[0]?.split(/[._-]/)[0] ?? "Member";

  return (
    <SettingsWorkspace
      panel={panel}
      email={email}
      initialDisplayName={resolvedProfile.display_name ?? fallbackName}
      initialUsername={resolvedProfile.username ?? ""}
      initialAvatarUrl={resolvedProfile.avatar_url ?? ""}
      initialBio={resolvedProfile.bio ?? ""}
      initialPhone={resolvedProfile.phone ?? ""}
      initialTimezone={
        resolvedProfile.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    />
  );
}

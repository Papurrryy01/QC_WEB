"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

const REMEMBER_ME_KEY = "qc.remember-me";
const BROWSER_SESSION_KEY = "qc.browser-session";

export default function RememberSessionGuard() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const rememberSetting = window.localStorage.getItem(REMEMBER_ME_KEY);
    if (rememberSetting !== "0") {
      return;
    }

    const hasBrowserSession = window.sessionStorage.getItem(BROWSER_SESSION_KEY) === "1";
    if (hasBrowserSession) {
      return;
    }

    void supabaseBrowser.auth.signOut().finally(() => {
      router.replace("/login");
      router.refresh();
    });
  }, [router]);

  return null;
}

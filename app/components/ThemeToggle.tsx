"use client";

import { useEffect } from "react";

const STORAGE_KEY = "qc.theme";

function applyTheme() {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", "light");
}

export default function ThemeToggle({
  className,
}: {
  className?: string;
}) {
  useEffect(() => {
    applyTheme();
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "light");
    }
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      if (event.newValue !== "light") {
        window.localStorage.setItem(STORAGE_KEY, "light");
      }
      applyTheme();
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function toggleTheme() {
    applyTheme();
    window.localStorage.setItem(STORAGE_KEY, "light");
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={className ?? "qc-theme-toggle"}
      aria-label="Light mode locked"
      title="Light mode locked"
    >
      Light
    </button>
  );
}

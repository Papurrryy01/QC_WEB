"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IconChevronDown, IconHamburger } from "@/app/components/icons/CoolIcons";

const MENU_ITEMS = [
  { href: "/app", label: "Home" },
  { href: "/app/create", label: "Create" },
  { href: "/app/moments", label: "Moments" },
  { href: "/app/insights", label: "Insights" },
];

const SETTINGS_MENU_ITEMS = [
  {
    panel: "profile",
    href: "/app/settings?panel=profile",
    label: "Profile & account",
    description: "Identity, photo, username, bio, phone, timezone",
  },
  {
    panel: "permissions",
    href: "/app/settings?panel=permissions",
    label: "Permissions & privacy",
    description: "Location, notifications, camera, microphone",
  },
  {
    panel: "notifications",
    href: "/app/settings?panel=notifications",
    label: "Notifications",
    description: "Reminders, countdown alerts, delivery channels",
  },
  {
    panel: "delivery",
    href: "/app/settings?panel=delivery",
    label: "Delivery preferences",
    description: "Timezone defaults, quiet hours, reveal behavior",
  },
  {
    panel: "security",
    href: "/app/settings?panel=security",
    label: "Security",
    description: "Password, two-factor preference, active sessions",
  },
  {
    panel: "legal",
    href: "/app/settings?panel=legal",
    label: "Legal & info",
    description: "Privacy, terms, cookies, status, support references",
  },
];

const MOBILE_ITEMS = [
  { href: "/app", label: "Home" },
  { href: "/app/create", label: "Create" },
  { href: "/app/moments", label: "Moments" },
  { href: "/app/settings?panel=profile", label: "Profile" },
];

function isActive(pathname: string, href: string) {
  const route = href.split("?")[0] ?? href;
  if (route === "/app") return pathname === "/app";
  return pathname === route || pathname.startsWith(`${route}/`);
}

export default function AppNavigation({
  email,
  monogram,
  displayName,
  username,
  avatarUrl,
}: {
  email: string;
  monogram: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);
  const isSettingsRoute = pathname === "/app/settings" || pathname.startsWith("/app/settings/");
  const rawSettingsPanel = searchParams.get("panel");
  const activeSettingsPanel = SETTINGS_MENU_ITEMS.some(
    (item) => item.panel === rawSettingsPanel
  )
    ? rawSettingsPanel
    : "profile";

  useEffect(() => {
    if (!isProfileOpen && !isSettingsMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const node = event.target as Node | null;
      if (!node) return;
      const insideProfile = profileRef.current?.contains(node) ?? false;
      const insideSettings = settingsMenuRef.current?.contains(node) ?? false;
      if (!insideProfile && !insideSettings) {
        setIsProfileOpen(false);
        setIsSettingsMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProfileOpen(false);
        setIsSettingsMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isProfileOpen, isSettingsMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMobileMenuOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <header className="qc-nav">
        <div className="qc-nav-inner qc-app-nav-inner">
          <Link href="/app" className="qc-logo">
            QC
          </Link>

          <nav className="qc-app-nav-center hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {MENU_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`qc-nav-link qc-app-nav-link ${active ? "bg-[var(--qc-accent-soft)] text-[var(--qc-accent)]" : ""}`}
                >
                  {item.label}
                </Link>
              );
            })}

            <div ref={settingsMenuRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false);
                  setIsSettingsMenuOpen((open) => !open);
                }}
                className={`qc-nav-link qc-app-nav-link inline-flex items-center gap-1 ${
                  isSettingsRoute || isSettingsMenuOpen
                    ? "bg-[var(--qc-accent-soft)] text-[var(--qc-accent)]"
                    : ""
                }`}
                aria-expanded={isSettingsMenuOpen}
                aria-haspopup="menu"
              >
                Settings
                <IconChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${
                    isSettingsMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <div
                className={`absolute right-0 top-[calc(100%+0.5rem)] z-20 w-[290px] rounded-[16px] border border-[var(--qc-border)] bg-[var(--qc-surface-strong)] p-2 shadow-[var(--qc-shadow-1)] transition ${
                  isSettingsMenuOpen
                    ? "pointer-events-auto translate-y-0 opacity-100"
                    : "pointer-events-none -translate-y-1 opacity-0"
                }`}
                role="menu"
                aria-label="Settings sections"
              >
                <p className="px-3 pb-1 pt-2 text-[10px] uppercase tracking-[0.2em] text-[var(--qc-text-faint)]">
                  Settings sections
                </p>

                {SETTINGS_MENU_ITEMS.map((item) => {
                  const active = isSettingsRoute && activeSettingsPanel === item.panel;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsSettingsMenuOpen(false)}
                      className={`block rounded-[12px] px-3 py-2.5 transition hover:bg-[var(--qc-surface-muted)] ${
                        active ? "bg-[var(--qc-accent-soft)]" : ""
                      }`}
                      role="menuitem"
                    >
                      <span
                        className={`block text-sm ${active ? "text-[var(--qc-accent)]" : "text-[var(--qc-text-soft)]"}`}
                      >
                        {item.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-[var(--qc-text-muted)]">
                        {item.description}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>

          <div className="qc-app-nav-controls">
            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsSettingsMenuOpen(false);
                  setIsProfileOpen((open) => !open);
                }}
                className="qc-app-avatar-button"
                aria-expanded={isProfileOpen}
                aria-label="Open profile menu"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={`${displayName} avatar`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  monogram
                )}
              </button>

              <div
                className={`absolute right-0 top-[calc(100%+0.5rem)] w-64 rounded-[16px] border border-[var(--qc-border)] bg-[var(--qc-surface-strong)] p-2 shadow-[var(--qc-shadow-1)] transition ${
                  isProfileOpen
                    ? "pointer-events-auto translate-y-0 opacity-100"
                    : "pointer-events-none -translate-y-1 opacity-0"
                }`}
              >
                <div className="border-b border-[var(--qc-border)] px-3 py-2">
                  <p className="truncate text-sm text-[var(--qc-text)]">{displayName}</p>
                  <p className="truncate text-xs text-[var(--qc-text-muted)]">
                    {username ? `@${username}` : email}
                  </p>
                </div>
                <Link
                  href="/app/settings?panel=profile"
                  onClick={() => setIsProfileOpen(false)}
                  className="mt-1 block rounded-[10px] px-3 py-2 text-sm text-[var(--qc-text-muted)] transition hover:bg-[var(--qc-surface-muted)] hover:text-[var(--qc-text)]"
                >
                  Profile settings
                </Link>
                <form action="/auth/logout" method="post">
                  <button
                    type="submit"
                    onClick={() => setIsProfileOpen(false)}
                    className="mt-1 block w-full rounded-[10px] px-3 py-2 text-left text-sm text-[var(--qc-text-muted)] transition hover:bg-[var(--qc-surface-muted)] hover:text-[var(--qc-text)]"
                  >
                    Logout
                  </button>
                </form>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsProfileOpen(false);
                setIsSettingsMenuOpen(false);
                setIsMobileMenuOpen((open) => !open);
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--qc-border)] bg-[var(--qc-surface)] text-[var(--qc-text-soft)] md:hidden"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
            >
              <IconHamburger className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-[60] transition md:hidden ${
          isMobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!isMobileMenuOpen}
      >
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(false)}
          className={`absolute inset-0 bg-[var(--qc-overlay)] transition ${
            isMobileMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          aria-label="Close menu"
        />

        <aside
          className={`absolute left-0 top-0 h-full w-[82vw] max-w-[320px] border-r border-[var(--qc-border)] bg-[var(--qc-surface-strong)] p-5 shadow-[var(--qc-shadow-2)] transition-transform ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <p className="qc-kicker">Navigation</p>
          <nav className="mt-4 grid gap-1">
            {MENU_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`rounded-[12px] px-3 py-2.5 text-sm transition ${
                    active
                      ? "bg-[var(--qc-accent-soft)] text-[var(--qc-accent)]"
                      : "text-[var(--qc-text-muted)] hover:bg-[var(--qc-surface-muted)] hover:text-[var(--qc-text)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 border-t border-[var(--qc-border)] pt-3">
            <p className="px-3 text-[10px] uppercase tracking-[0.2em] text-[var(--qc-text-faint)]">
              Settings sections
            </p>
            <nav className="mt-1 grid gap-1">
              {SETTINGS_MENU_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-[12px] px-3 py-2 text-sm text-[var(--qc-text-muted)] transition hover:bg-[var(--qc-surface-muted)] hover:text-[var(--qc-text)]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </aside>
      </div>

      <div className="qc-mobile-tabbar" aria-hidden="true">
        <div className="qc-mobile-tabbar-inner">
          {MOBILE_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`qc-mobile-tab ${active ? "is-active" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

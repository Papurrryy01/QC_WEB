"use client";

import PermissionCenter from "./PermissionCenter";
import NotificationsCenter from "./NotificationsCenter";
import SecurityCenter from "./SecurityCenter";
import SettingsClient from "./SettingsClient";
import DeliveryPreferencesCenter from "./DeliveryPreferencesCenter";
import LegalInfoCenter from "./LegalInfoCenter";

type SettingsWorkspaceProps = {
  panel: SettingsPanel;
  email: string;
  initialDisplayName: string;
  initialUsername: string;
  initialAvatarUrl: string;
  initialBio: string;
  initialPhone: string;
  initialTimezone: string;
};

export type SettingsPanel =
  | "profile"
  | "permissions"
  | "notifications"
  | "security"
  | "delivery"
  | "legal";

const PANEL_COPY: Record<SettingsPanel, { label: string; purpose: string }> = {
  profile: {
    label: "Profile and account",
    purpose: "Manage identity, photo, username, bio, phone, and timezone.",
  },
  permissions: {
    label: "Permissions and privacy",
    purpose: "Control consent and device access used by QC features.",
  },
  notifications: {
    label: "Notifications",
    purpose: "Configure reminders, countdown signals, and delivery alerts.",
  },
  security: {
    label: "Security",
    purpose: "Protect your account with password and session controls.",
  },
  delivery: {
    label: "Delivery preferences",
    purpose: "Set default timing, timezone behavior, and reveal style.",
  },
  legal: {
    label: "Legal and info",
    purpose: "Quick access to policies, system status, and support references.",
  },
};

export default function SettingsWorkspace({
  panel,
  email,
  initialDisplayName,
  initialUsername,
  initialAvatarUrl,
  initialBio,
  initialPhone,
  initialTimezone,
}: SettingsWorkspaceProps) {
  const activePanel = PANEL_COPY[panel];

  return (
    <div className="qc-app-section">
      <section className="qc-card qc-card--hero">
        <p className="qc-kicker">Settings</p>
        <h1 className="qc-heading-xl">{activePanel.label}</h1>
        <p className="qc-copy">{activePanel.purpose}</p>
      </section>

      {panel === "profile" ? (
        <SettingsClient
          email={email}
          initialDisplayName={initialDisplayName}
          initialUsername={initialUsername}
          initialAvatarUrl={initialAvatarUrl}
          initialBio={initialBio}
          initialPhone={initialPhone}
          initialTimezone={initialTimezone}
        />
      ) : panel === "notifications" ? (
        <NotificationsCenter />
      ) : panel === "security" ? (
        <SecurityCenter />
      ) : panel === "delivery" ? (
        <DeliveryPreferencesCenter timezoneFallback={initialTimezone} />
      ) : panel === "legal" ? (
        <LegalInfoCenter />
      ) : (
        <PermissionCenter />
      )}
    </div>
  );
}

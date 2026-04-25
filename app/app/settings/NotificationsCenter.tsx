"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_QC_SETTINGS_PREFERENCES,
  type NotificationPreferences,
} from "@/lib/settingsPreferences";

type PreferencesResponse = {
  preferences?: {
    notifications?: NotificationPreferences;
  };
  error?: string;
};

const NOTIFICATION_ROWS: Array<{
  key: keyof Omit<NotificationPreferences, "channels">;
  label: string;
  description: string;
}> = [
  {
    key: "momentReminders",
    label: "Moment reminders",
    description: "Receive reminders before your scheduled moments.",
  },
  {
    key: "countdownNotifications",
    label: "Countdown notifications",
    description: "Get countdown updates as delivery approaches.",
  },
  {
    key: "deliveryAlerts",
    label: "Delivery alerts",
    description: "Know when a moment is delivered.",
  },
  {
    key: "recipientOpenedMoment",
    label: "Recipient opened moment",
    description: "Optional alert when a recipient opens a moment.",
  },
];

export default function NotificationsCenter() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    DEFAULT_QC_SETTINGS_PREFERENCES.notifications
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch("/api/settings/preferences");
        const payload = (await res.json().catch(() => null)) as PreferencesResponse | null;
        if (!active) return;

        if (!res.ok) {
          throw new Error(payload?.error ?? "Could not load notification settings.");
        }

        if (payload?.preferences?.notifications) {
          setPreferences(payload.preferences.notifications);
        }
      } catch (loadError) {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load notification settings."
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  async function savePreferences() {
    if (saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch("/api/settings/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifications: preferences }),
      });
      const payload = (await res.json().catch(() => null)) as PreferencesResponse | null;
      if (!res.ok) {
        throw new Error(payload?.error ?? "Could not save notification settings.");
      }
      setNotice("Notification preferences saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save notification settings."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="qc-card">
      <div className="qc-settings-section-head">
        <p className="qc-kicker">Notifications</p>
        <h2 className="qc-heading-lg">Timing and delivery alerts</h2>
        <p className="qc-copy">
          Control reminder timing, delivery events, and where alerts should reach
          you.
        </p>
      </div>

      <div className="qc-grid" style={{ marginTop: "1rem" }}>
        {NOTIFICATION_ROWS.map((row) => (
          <article key={row.key} className="qc-card qc-card--inset qc-settings-choice-card">
            <div className="qc-settings-choice-head">
              <div>
                <p className="qc-heading-sm">{row.label}</p>
                <p className="qc-copy" style={{ marginTop: "0.3rem" }}>
                  {row.description}
                </p>
              </div>

              <label className="qc-switch">
                <input
                  type="checkbox"
                  checked={preferences[row.key]}
                  onChange={(event) => {
                    setPreferences((current) => ({
                      ...current,
                      [row.key]: event.target.checked,
                    }));
                  }}
                />
                <span className="qc-switch-track" />
              </label>
            </div>
          </article>
        ))}
      </div>

      <section className="qc-card qc-card--inset" style={{ marginTop: "0.9rem" }}>
        <p className="qc-settings-section-label">Channels</p>
        <p className="qc-copy" style={{ marginTop: "0.3rem" }}>
          Choose how QC should notify you for enabled events.
        </p>

        <div className="qc-settings-check-grid">
          <label className="qc-settings-check-item">
            <input
              type="checkbox"
              checked={preferences.channels.push}
              onChange={(event) =>
                setPreferences((current) => ({
                  ...current,
                  channels: { ...current.channels, push: event.target.checked },
                }))
              }
            />
            <span>Push</span>
          </label>

          <label className="qc-settings-check-item">
            <input
              type="checkbox"
              checked={preferences.channels.email}
              onChange={(event) =>
                setPreferences((current) => ({
                  ...current,
                  channels: { ...current.channels, email: event.target.checked },
                }))
              }
            />
            <span>Email</span>
          </label>

          <label className="qc-settings-check-item">
            <input
              type="checkbox"
              checked={preferences.channels.sms}
              onChange={(event) =>
                setPreferences((current) => ({
                  ...current,
                  channels: { ...current.channels, sms: event.target.checked },
                }))
              }
            />
            <span>SMS</span>
          </label>
        </div>
      </section>

      <div className="qc-settings-actions" style={{ marginTop: "0.95rem" }}>
        <div className="qc-settings-action-row">
          <button
            type="button"
            onClick={savePreferences}
            disabled={saving || loading}
            className="qc-button qc-button--primary"
          >
            {saving ? "Saving..." : "Save notifications"}
          </button>
        </div>

        {notice && <p className="qc-status qc-status--success">{notice}</p>}
        {error && <p className="qc-status qc-status--danger">{error}</p>}
      </div>
    </section>
  );
}

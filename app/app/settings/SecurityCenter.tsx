"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import {
  DEFAULT_QC_SETTINGS_PREFERENCES,
  type SecurityPreferences,
} from "@/lib/settingsPreferences";

type MeResponse = {
  user?: {
    email?: string | null;
    createdAt?: string | null;
    lastSignInAt?: string | null;
    emailConfirmedAt?: string | null;
    providers?: string[];
  } | null;
  error?: string;
};

type PreferencesResponse = {
  preferences?: {
    security?: SecurityPreferences;
  };
  error?: string;
};

export default function SecurityCenter() {
  const [preferences, setPreferences] = useState<SecurityPreferences>(
    DEFAULT_QC_SETTINGS_PREFERENCES.security
  );
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [lastSignInAt, setLastSignInAt] = useState<string | null>(null);
  const [emailConfirmedAt, setEmailConfirmedAt] = useState<string | null>(null);
  const [providers, setProviders] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [prefRes, meRes] = await Promise.all([
          fetch("/api/settings/preferences"),
          fetch("/api/auth/me"),
        ]);

        const prefPayload = (await prefRes.json().catch(() => null)) as
          | PreferencesResponse
          | null;
        const mePayload = (await meRes.json().catch(() => null)) as MeResponse | null;

        if (!active) return;

        if (!prefRes.ok) {
          throw new Error(prefPayload?.error ?? "Could not load security settings.");
        }

        if (prefPayload?.preferences?.security) {
          setPreferences(prefPayload.preferences.security);
        }

        if (meRes.ok && mePayload?.user) {
          setLastSignInAt(mePayload.user.lastSignInAt ?? null);
          setEmailConfirmedAt(mePayload.user.emailConfirmedAt ?? null);
          setProviders(Array.isArray(mePayload.user.providers) ? mePayload.user.providers : []);
        }
      } catch (loadError) {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load security settings."
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

  async function saveSecurityPreferences() {
    if (savingPrefs) return;
    setSavingPrefs(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch("/api/settings/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ security: preferences }),
      });
      const payload = (await res.json().catch(() => null)) as PreferencesResponse | null;
      if (!res.ok) {
        throw new Error(payload?.error ?? "Could not save security preferences.");
      }
      setNotice("Security preferences saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save security preferences."
      );
    } finally {
      setSavingPrefs(false);
    }
  }

  async function updatePassword() {
    if (savingPassword) return;
    setSavingPassword(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch("/api/settings/security/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: newPassword,
          confirmPassword,
        }),
      });
      const payload = (await res.json().catch(() => null)) as
        | { error?: string; ok?: boolean }
        | null;
      if (!res.ok) {
        throw new Error(payload?.error ?? "Could not update password.");
      }

      setNewPassword("");
      setConfirmPassword("");
      setNotice("Password updated.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Could not update password."
      );
    } finally {
      setSavingPassword(false);
    }
  }

  async function signOutAllDevices() {
    if (signingOutAll) return;
    setSigningOutAll(true);
    setError(null);
    setNotice(null);

    try {
      const { error: signOutError } = await supabaseBrowser.auth.signOut({
        scope: "global",
      });
      if (signOutError) throw new Error(signOutError.message);
      window.location.assign("/login");
    } catch (signOutError) {
      setError(
        signOutError instanceof Error
          ? signOutError.message
          : "Could not sign out all devices."
      );
      setSigningOutAll(false);
    }
  }

  return (
    <section className="qc-card">
      <div className="qc-settings-section-head">
        <p className="qc-kicker">Security</p>
        <h2 className="qc-heading-lg">Account protection and session control</h2>
        <p className="qc-copy">
          Manage password, session access, and account verification posture.
        </p>
      </div>

      <section className="qc-card qc-card--inset" style={{ marginTop: "1rem" }}>
        <p className="qc-settings-section-label">Two-factor preference</p>
        <p className="qc-copy" style={{ marginTop: "0.3rem" }}>
          Select how you want QC to challenge logins when two-factor is enabled.
        </p>

        <div className="qc-settings-pill-row">
          {[
            { value: "off", label: "Off" },
            { value: "sms", label: "SMS" },
            { value: "authenticator", label: "Authenticator" },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              className={`qc-settings-pill ${
                preferences.twoFactorMode === item.value
                  ? "qc-settings-pill--active"
                  : ""
              }`}
              onClick={() =>
                setPreferences({
                  twoFactorMode: item.value as SecurityPreferences["twoFactorMode"],
                })
              }
            >
              {item.label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: "0.8rem" }}>
          <button
            type="button"
            disabled={savingPrefs || loading}
            onClick={saveSecurityPreferences}
            className="qc-button qc-button--secondary"
          >
            {savingPrefs ? "Saving..." : "Save security preference"}
          </button>
        </div>
      </section>

      <section className="qc-card qc-card--inset" style={{ marginTop: "0.8rem" }}>
        <p className="qc-settings-section-label">Change password</p>
        <div className="qc-settings-grid qc-settings-grid--2" style={{ marginTop: "0.6rem" }}>
          <div className="qc-settings-field">
            <label htmlFor="security-new-password" className="qc-field-label">
              New password
            </label>
            <input
              id="security-new-password"
              type="password"
              className="qc-input qc-settings-input"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="At least 8 chars, uppercase, number, symbol"
            />
          </div>

          <div className="qc-settings-field">
            <label htmlFor="security-confirm-password" className="qc-field-label">
              Confirm password
            </label>
            <input
              id="security-confirm-password"
              type="password"
              className="qc-input qc-settings-input"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repeat new password"
            />
          </div>
        </div>

        <div style={{ marginTop: "0.8rem" }}>
          <button
            type="button"
            disabled={savingPassword || !newPassword || !confirmPassword}
            onClick={updatePassword}
            className="qc-button qc-button--primary"
          >
            {savingPassword ? "Updating..." : "Update password"}
          </button>
        </div>
      </section>

      <section className="qc-card qc-card--inset" style={{ marginTop: "0.8rem" }}>
        <p className="qc-settings-section-label">Sessions and activity</p>
        <div className="qc-settings-activity-grid">
          <p className="qc-copy">
            <strong>Current session:</strong> This browser
          </p>
          <p className="qc-copy">
            <strong>Last sign-in:</strong>{" "}
            {lastSignInAt ? new Date(lastSignInAt).toLocaleString() : "Not available"}
          </p>
          <p className="qc-copy">
            <strong>Email verified:</strong>{" "}
            {emailConfirmedAt ? new Date(emailConfirmedAt).toLocaleString() : "Pending"}
          </p>
          <p className="qc-copy">
            <strong>Connected providers:</strong>{" "}
            {providers.length ? providers.join(", ") : "Email/password"}
          </p>
        </div>

        <div style={{ marginTop: "0.8rem" }}>
          <button
            type="button"
            disabled={signingOutAll}
            onClick={signOutAllDevices}
            className="qc-button qc-button--secondary"
          >
            {signingOutAll ? "Signing out..." : "Sign out all devices"}
          </button>
        </div>
      </section>

      <div className="qc-settings-actions" style={{ marginTop: "0.95rem" }}>
        {notice && <p className="qc-status qc-status--success">{notice}</p>}
        {error && <p className="qc-status qc-status--danger">{error}</p>}
      </div>
    </section>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { getTimezoneOptions } from "@/lib/timezone";
import {
  DEFAULT_QC_SETTINGS_PREFERENCES,
  type DeliveryPreferences,
} from "@/lib/settingsPreferences";

type DeliveryPreferencesCenterProps = {
  timezoneFallback: string;
};

type PreferencesResponse = {
  preferences?: {
    delivery?: DeliveryPreferences;
  };
  error?: string;
};

export default function DeliveryPreferencesCenter({
  timezoneFallback,
}: DeliveryPreferencesCenterProps) {
  const [preferences, setPreferences] = useState<DeliveryPreferences>({
    ...DEFAULT_QC_SETTINGS_PREFERENCES.delivery,
    defaultTimezone: timezoneFallback || DEFAULT_QC_SETTINGS_PREFERENCES.delivery.defaultTimezone,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const timezoneOptions = useMemo(
    () => getTimezoneOptions(preferences.defaultTimezone),
    [preferences.defaultTimezone]
  );

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch("/api/settings/preferences");
        const payload = (await res.json().catch(() => null)) as PreferencesResponse | null;
        if (!active) return;

        if (!res.ok) {
          throw new Error(payload?.error ?? "Could not load delivery settings.");
        }

        if (payload?.preferences?.delivery) {
          setPreferences(payload.preferences.delivery);
        }
      } catch (loadError) {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load delivery settings."
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
        body: JSON.stringify({
          timezoneFallback,
          delivery: preferences,
        }),
      });
      const payload = (await res.json().catch(() => null)) as PreferencesResponse | null;
      if (!res.ok) {
        throw new Error(payload?.error ?? "Could not save delivery settings.");
      }
      setNotice("Delivery preferences saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Could not save delivery settings."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="qc-card">
      <div className="qc-settings-section-head">
        <p className="qc-kicker">Delivery</p>
        <h2 className="qc-heading-lg">Timing defaults and reveal behavior</h2>
        <p className="qc-copy">
          Set the timing behavior QC should use by default whenever you create a
          new moment.
        </p>
      </div>

      <div className="qc-settings-grid qc-settings-grid--2" style={{ marginTop: "1rem" }}>
        <div className="qc-settings-field">
          <label htmlFor="delivery-timezone" className="qc-field-label">
            Default timezone
          </label>
          <select
            id="delivery-timezone"
            value={preferences.defaultTimezone}
            onChange={(event) =>
              setPreferences((current) => ({
                ...current,
                defaultTimezone: event.target.value,
              }))
            }
            className="qc-input qc-settings-input"
          >
            {timezoneOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="qc-settings-field">
          <p className="qc-field-label">Quiet hours</p>
          <div className="qc-switch-row">
            <label className="qc-switch">
              <input
                type="checkbox"
                checked={preferences.quietHoursEnabled}
                onChange={(event) =>
                  setPreferences((current) => ({
                    ...current,
                    quietHoursEnabled: event.target.checked,
                  }))
                }
              />
              <span className="qc-switch-track" />
            </label>
            <span className="qc-copy">
              Pause non-critical reminders during your selected window.
            </span>
          </div>
        </div>

        <div className="qc-settings-field">
          <label htmlFor="quiet-start" className="qc-field-label">
            Quiet start
          </label>
          <input
            id="quiet-start"
            type="time"
            value={preferences.quietHoursStart}
            onChange={(event) =>
              setPreferences((current) => ({
                ...current,
                quietHoursStart: event.target.value,
              }))
            }
            disabled={!preferences.quietHoursEnabled}
            className="qc-input qc-settings-input"
          />
        </div>

        <div className="qc-settings-field">
          <label htmlFor="quiet-end" className="qc-field-label">
            Quiet end
          </label>
          <input
            id="quiet-end"
            type="time"
            value={preferences.quietHoursEnd}
            onChange={(event) =>
              setPreferences((current) => ({
                ...current,
                quietHoursEnd: event.target.value,
              }))
            }
            disabled={!preferences.quietHoursEnabled}
            className="qc-input qc-settings-input"
          />
        </div>
      </div>

      <div className="qc-settings-grid qc-settings-grid--2" style={{ marginTop: "0.3rem" }}>
        <section className="qc-card qc-card--inset qc-settings-choice-card">
          <p className="qc-settings-section-label">Delivery style</p>
          <p className="qc-copy">Choose how QC emphasizes timing in the experience.</p>

          <div className="qc-settings-pill-row">
            {[
              { value: "balanced", label: "Balanced" },
              { value: "instant", label: "Instant-first" },
              { value: "countdown", label: "Countdown-first" },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                className={`qc-settings-pill ${
                  preferences.deliveryStyle === item.value
                    ? "qc-settings-pill--active"
                    : ""
                }`}
                onClick={() =>
                  setPreferences((current) => ({
                    ...current,
                    deliveryStyle: item.value as DeliveryPreferences["deliveryStyle"],
                  }))
                }
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section className="qc-card qc-card--inset qc-settings-choice-card">
          <p className="qc-settings-section-label">Reveal behavior</p>
          <p className="qc-copy">Control how recipients open a completed reveal.</p>

          <div className="qc-settings-pill-row">
            {[
              { value: "tap_to_open", label: "Tap to open" },
              { value: "auto_open", label: "Auto-open" },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                className={`qc-settings-pill ${
                  preferences.revealBehavior === item.value
                    ? "qc-settings-pill--active"
                    : ""
                }`}
                onClick={() =>
                  setPreferences((current) => ({
                    ...current,
                    revealBehavior: item.value as DeliveryPreferences["revealBehavior"],
                  }))
                }
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="qc-settings-actions" style={{ marginTop: "0.95rem" }}>
        <div className="qc-settings-action-row">
          <button
            type="button"
            onClick={savePreferences}
            disabled={saving || loading}
            className="qc-button qc-button--primary"
          >
            {saving ? "Saving..." : "Save delivery preferences"}
          </button>
        </div>

        {notice && <p className="qc-status qc-status--success">{notice}</p>}
        {error && <p className="qc-status qc-status--danger">{error}</p>}
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ConsentKey =
  | "location"
  | "notifications"
  | "camera"
  | "microphone"
  | "clipboard";

type PermissionStatus =
  | "granted"
  | "denied"
  | "prompt"
  | "unsupported"
  | "action_only"
  | "error";

type ConsentAudit = Partial<
  Record<ConsentKey, { status: PermissionStatus; updatedAt: string }>
>;

const STORAGE_KEY = "qc.permission-consent.v1";

type PermissionItem = {
  key: ConsentKey;
  title: string;
  purpose: string;
  legal: string;
  requestable: boolean;
};

const PERMISSIONS: PermissionItem[] = [
  {
    key: "location",
    title: "Location",
    purpose: "Auto-set timezone and improve scheduled delivery context.",
    legal:
      "Location is requested only when you tap Allow. You can revoke it in browser settings at any time.",
    requestable: true,
  },
  {
    key: "notifications",
    title: "Notifications",
    purpose: "Send browser reminders for upcoming moments.",
    legal:
      "Notifications are optional and event-based. You can disable them later in browser settings.",
    requestable: true,
  },
  {
    key: "camera",
    title: "Camera",
    purpose: "Capture media for moments directly from your device.",
    legal:
      "Camera access is off by default and requested only when you choose camera features.",
    requestable: true,
  },
  {
    key: "microphone",
    title: "Microphone",
    purpose: "Record voice content for moments.",
    legal:
      "Microphone access is optional and requested only on direct action.",
    requestable: true,
  },
  {
    key: "clipboard",
    title: "Clipboard",
    purpose: "Copy secure links only when you tap Copy.",
    legal: "No background clipboard tracking is performed. Access is action-based only.",
    requestable: false,
  },
];

function detectPermissionState(
  state: PermissionState | NotificationPermission | "unsupported"
): PermissionStatus {
  if (state === "granted" || state === "denied" || state === "prompt") return state;
  if (state === "default") return "prompt";
  return "unsupported";
}

async function queryPermission(name: PermissionName): Promise<PermissionStatus> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return "unsupported";
  }

  try {
    const status = await navigator.permissions.query({ name });
    return detectPermissionState(status.state);
  } catch {
    return "unsupported";
  }
}

function statusLabel(status: PermissionStatus) {
  if (status === "granted") return "Allowed";
  if (status === "denied") return "Denied";
  if (status === "prompt") return "Not decided";
  if (status === "action_only") return "Action based";
  if (status === "error") return "Error";
  return "Unsupported";
}

function badgeClass(status: PermissionStatus) {
  if (status === "granted") return "qc-status qc-status--success";
  if (status === "denied") return "qc-status qc-status--danger";
  if (status === "prompt") return "qc-status qc-status--warning";
  return "qc-status";
}

export default function PermissionCenter() {
  const [statusByKey, setStatusByKey] = useState<Record<ConsentKey, PermissionStatus>>({
    location: "prompt",
    notifications: "prompt",
    camera: "prompt",
    microphone: "prompt",
    clipboard: "action_only",
  });
  const [auditByKey, setAuditByKey] = useState<ConsentAudit>({});
  const [busyKey, setBusyKey] = useState<ConsentKey | null>(null);

  const sortedPermissions = useMemo(() => PERMISSIONS, []);

  function persistAudit(next: ConsentAudit) {
    setAuditByKey(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore localStorage write errors.
    }
  }

  function updateStatus(key: ConsentKey, status: PermissionStatus, writeAudit = true) {
    setStatusByKey((current) => ({ ...current, [key]: status }));
    if (!writeAudit) return;

    const next = {
      ...auditByKey,
      [key]: { status, updatedAt: new Date().toISOString() },
    };
    persistAudit(next);
  }

  async function refreshStatuses() {
    const location = await queryPermission("geolocation");

    const notification =
      typeof Notification === "undefined"
        ? "unsupported"
        : detectPermissionState(Notification.permission);

    const camera = await queryPermission("camera" as PermissionName);
    const microphone = await queryPermission("microphone" as PermissionName);

    setStatusByKey({
      location,
      notifications: notification,
      camera,
      microphone,
      clipboard: "action_only",
    });
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ConsentAudit;
        setAuditByKey(parsed);
      }
    } catch {
      // Ignore localStorage parsing errors.
    }

    refreshStatuses();
  }, []);

  async function requestPermission(key: ConsentKey) {
    if (busyKey) return;
    setBusyKey(key);

    try {
      if (key === "location") {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
          updateStatus(key, "unsupported");
          return;
        }

        const result = await new Promise<PermissionStatus>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve("granted"),
            (error) => {
              if (error.code === error.PERMISSION_DENIED) resolve("denied");
              else resolve("error");
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
          );
        });

        updateStatus(key, result);
        return;
      }

      if (key === "notifications") {
        if (typeof Notification === "undefined") {
          updateStatus(key, "unsupported");
          return;
        }

        const result = await Notification.requestPermission();
        updateStatus(key, detectPermissionState(result));
        return;
      }

      if (key === "camera" || key === "microphone") {
        if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
          updateStatus(key, "unsupported");
          return;
        }

        try {
          const constraints = key === "camera" ? { video: true } : { audio: true };
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          stream.getTracks().forEach((track) => track.stop());
          updateStatus(key, "granted");
        } catch (error) {
          const errorName =
            typeof error === "object" && error && "name" in error
              ? String((error as { name?: string }).name)
              : "";

          if (errorName === "NotAllowedError" || errorName === "SecurityError") {
            updateStatus(key, "denied");
          } else {
            updateStatus(key, "error");
          }
        }
      }
    } finally {
      setBusyKey(null);
    }
  }

  function getActionLabel(requestable: boolean, status: PermissionStatus): string | null {
    if (!requestable) return null;
    if (status === "granted") return null;
    if (status === "denied") return "Enable";
    if (status === "error") return "Try again";
    if (status === "prompt") return "Allow";
    return null;
  }

  return (
    <section className="qc-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="qc-kicker">Permissions</p>
          <h2 className="qc-heading-lg">Consent and device access</h2>
        </div>
        <button type="button" onClick={refreshStatuses} className="qc-button qc-button--secondary">
          Refresh
        </button>
      </div>

      <div className="qc-grid" style={{ marginTop: "1rem" }}>
        {sortedPermissions.map((permission) => {
          const status = statusByKey[permission.key];
          const actionLabel = getActionLabel(permission.requestable, status);
          const audit = auditByKey[permission.key];

          return (
            <article key={permission.key} className="qc-card qc-card--inset">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="qc-heading-sm">{permission.title}</p>
                  <p className="qc-copy" style={{ marginTop: "0.35rem" }}>
                    {permission.purpose}
                  </p>
                </div>

                <span className={badgeClass(status)}>{statusLabel(status)}</span>
              </div>

              <p className="qc-copy" style={{ marginTop: "0.65rem" }}>
                {permission.legal}
              </p>

              {audit?.updatedAt && (
                <p className="qc-copy" style={{ marginTop: "0.5rem" }}>
                  Last updated: {new Date(audit.updatedAt).toLocaleString()}
                </p>
              )}

              {actionLabel && (
                <div style={{ marginTop: "0.8rem" }}>
                  <button
                    type="button"
                    disabled={busyKey === permission.key}
                    onClick={() => requestPermission(permission.key)}
                    className="qc-button qc-button--primary"
                  >
                    {busyKey === permission.key ? "Requesting..." : actionLabel}
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <div style={{ marginTop: "1rem" }}>
        <Link href="/privacy" className="qc-nav-link">
          Read privacy policy
        </Link>
      </div>
    </section>
  );
}

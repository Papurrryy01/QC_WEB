"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FeatureToggleButton({
  momentId,
  initialFeatured,
  variant = "default",
}: {
  momentId: string;
  initialFeatured: boolean;
  variant?: "default" | "pill";
}) {
  const router = useRouter();
  const [isFeatured, setIsFeatured] = useState(initialFeatured);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleFeature() {
    if (loading) return;

    setLoading(true);
    setError(null);

    const nextValue = !isFeatured;

    try {
      const res = await fetch(`/api/moments/${momentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_featured",
          is_featured: nextValue,
        }),
      });

      const payload = (await res.json().catch(() => null)) as { error?: string } | null;

      if (!res.ok) {
        throw new Error(payload?.error ?? "Could not update Home visibility.");
      }

      setIsFeatured(nextValue);
      router.refresh();
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Could not update Home visibility."
      );
    } finally {
      setLoading(false);
    }
  }

  const buttonClass =
    variant === "pill"
      ? `qc-button ${isFeatured ? "qc-button--primary" : "qc-button--secondary"}`
      : `qc-button qc-button--secondary`;

  return (
    <div className="space-y-1">
      <button type="button" onClick={toggleFeature} disabled={loading} className={buttonClass}>
        {loading ? "Saving..." : isFeatured ? "Remove from Home" : "Add to Home"}
      </button>
      {error && <p className="qc-status qc-status--danger">{error}</p>}
    </div>
  );
}

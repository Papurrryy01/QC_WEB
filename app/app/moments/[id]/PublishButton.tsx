"use client";

import { useRouter } from "next/navigation";

export default function PublishButton({ id }: { id: string }) {
  const router = useRouter();

  async function handlePublish() {
    const res = await fetch(`/api/moments/${id}/publish`, {
      method: "POST",
    });

    if (!res.ok) {
      alert("Failed to publish moment");
      return;
    }

    router.refresh();
  }

  return (
    <button type="button" onClick={handlePublish} className="qc-button qc-button--primary">
      Publish moment
    </button>
  );
}

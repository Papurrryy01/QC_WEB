"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { useRouter } from "next/navigation";
import { getTimezoneOptions, toFriendlyTimezoneLabel } from "@/lib/timezone";

type TimezoneLocationState =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unsupported"
  | "error";

type SettingsClientProps = {
  email: string;
  initialDisplayName: string;
  initialUsername: string;
  initialAvatarUrl: string;
  initialBio: string;
  initialPhone: string;
  initialTimezone: string;
};

const AVATAR_MAX_BYTES = 10 * 1024 * 1024;
const AVATAR_MIN_DIMENSION = 300;
const CROPPED_AVATAR_SIZE = 512;

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

function isAcceptedImageFile(file: File) {
  const mime = file.type.toLowerCase();
  const acceptedMime = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
    "image/heic-sequence",
    "image/heif-sequence",
  ]);

  if (mime && (acceptedMime.has(mime) || mime.startsWith("image/"))) return true;

  const lower = file.name.toLowerCase();
  return [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"].some((ext) =>
    lower.endsWith(ext)
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load image."));
    image.src = source;
  });
}

function degreesToRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function rotatedBoundingBox(width: number, height: number, rotation: number) {
  const radians = degreesToRadians(rotation);
  return {
    width:
      Math.abs(Math.cos(radians) * width) + Math.abs(Math.sin(radians) * height),
    height:
      Math.abs(Math.sin(radians) * width) + Math.abs(Math.cos(radians) * height),
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not generate cropped image."));
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });
}

async function createCroppedAvatarBlob({
  imageSource,
  cropPixels,
  rotation,
}: {
  imageSource: string;
  cropPixels: Area;
  rotation: number;
}) {
  const image = await loadImage(imageSource);
  const bounds = rotatedBoundingBox(image.width, image.height, rotation);
  const radians = degreesToRadians(rotation);

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not initialize image editor.");

  canvas.width = Math.round(bounds.width);
  canvas.height = Math.round(bounds.height);

  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(radians);
  context.translate(-image.width / 2, -image.height / 2);
  context.drawImage(image, 0, 0);

  const croppedCanvas = document.createElement("canvas");
  const croppedContext = croppedCanvas.getContext("2d");
  if (!croppedContext) throw new Error("Could not initialize cropped image.");

  const safeWidth = Math.max(1, Math.round(cropPixels.width));
  const safeHeight = Math.max(1, Math.round(cropPixels.height));

  croppedCanvas.width = safeWidth;
  croppedCanvas.height = safeHeight;
  croppedContext.drawImage(
    canvas,
    Math.round(cropPixels.x),
    Math.round(cropPixels.y),
    safeWidth,
    safeHeight,
    0,
    0,
    safeWidth,
    safeHeight
  );

  const outputCanvas = document.createElement("canvas");
  const outputContext = outputCanvas.getContext("2d");
  if (!outputContext) throw new Error("Could not finalize avatar image.");

  outputCanvas.width = CROPPED_AVATAR_SIZE;
  outputCanvas.height = CROPPED_AVATAR_SIZE;
  outputContext.imageSmoothingEnabled = true;
  outputContext.imageSmoothingQuality = "high";
  outputContext.fillStyle = "#ffffff";
  outputContext.fillRect(0, 0, CROPPED_AVATAR_SIZE, CROPPED_AVATAR_SIZE);
  outputContext.drawImage(
    croppedCanvas,
    0,
    0,
    safeWidth,
    safeHeight,
    0,
    0,
    CROPPED_AVATAR_SIZE,
    CROPPED_AVATAR_SIZE
  );

  return canvasToBlob(outputCanvas, "image/jpeg", 0.92);
}

export default function SettingsClient({
  email,
  initialDisplayName,
  initialUsername,
  initialAvatarUrl,
  initialBio,
  initialPhone,
  initialTimezone,
}: SettingsClientProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [username, setUsername] = useState(initialUsername);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl || null);
  const [bio, setBio] = useState(initialBio);
  const [phone, setPhone] = useState(initialPhone);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarTouched, setAvatarTouched] = useState(false);
  const [isCropEditorOpen, setIsCropEditorOpen] = useState(false);
  const [cropImageSource, setCropImageSource] = useState<string | null>(null);
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const [cropRotation, setCropRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isCropSaving, setIsCropSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [timezoneLocationState, setTimezoneLocationState] =
    useState<TimezoneLocationState>("idle");
  const [timezoneLocationMessage, setTimezoneLocationMessage] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const timezoneOptions = useMemo(() => getTimezoneOptions(timezone), [timezone]);
  const avatarDisplayUrl = avatarPreview ?? avatarUrl;

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  useEffect(() => {
    if (!isCropEditorOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isCropSaving) {
        closeCropEditor();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isCropEditorOpen, isCropSaving]);

  function detectTimezone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }

  function requestTimezoneFromLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      const fallback = detectTimezone();
      setTimezone(fallback);
      setTimezoneLocationState("unsupported");
      setTimezoneLocationMessage(
        `Location is unavailable. Timezone set from your device: ${toFriendlyTimezoneLabel(
          fallback
        )}.`
      );
      return;
    }

    setTimezoneLocationState("requesting");
    setTimezoneLocationMessage("Waiting for location permission...");

    navigator.geolocation.getCurrentPosition(
      () => {
        const detected = detectTimezone();
        setTimezone(detected);
        setTimezoneLocationState("granted");
        setTimezoneLocationMessage(
          `Location allowed. Timezone set automatically: ${toFriendlyTimezoneLabel(detected)}.`
        );
      },
      (geoError) => {
        const fallback = detectTimezone();
        setTimezone(fallback);

        if (geoError.code === geoError.PERMISSION_DENIED) {
          setTimezoneLocationState("denied");
          setTimezoneLocationMessage(
            `Location denied. Keeping device timezone: ${toFriendlyTimezoneLabel(fallback)}.`
          );
          return;
        }

        setTimezoneLocationState("error");
        setTimezoneLocationMessage(
          `Could not read location. Keeping device timezone: ${toFriendlyTimezoneLabel(fallback)}.`
        );
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }

  function clearAvatarPreview() {
    setAvatarPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;

    if (!isAcceptedImageFile(file)) {
      setError("Use JPG, PNG, WEBP, HEIC, or HEIF.");
      return;
    }

    if (file.size > AVATAR_MAX_BYTES) {
      setError("Photo must be 10MB or smaller.");
      return;
    }

    try {
      const source = await readFileAsDataUrl(file);
      const image = await loadImage(source);
      if (
        image.naturalWidth < AVATAR_MIN_DIMENSION ||
        image.naturalHeight < AVATAR_MIN_DIMENSION
      ) {
        setError("Image must be at least 300 x 300.");
        return;
      }

      setError(null);
      setNotice(null);
      setCropPosition({ x: 0, y: 0 });
      setCropZoom(1);
      setCropRotation(0);
      setCroppedAreaPixels(null);
      setCropImageSource(source);
      setIsCropEditorOpen(true);
    } catch {
      setError("Could not open this image. Try another file.");
    }
  }

  function openAvatarPicker() {
    avatarInputRef.current?.click();
  }

  function handleRemoveAvatar() {
    clearAvatarPreview();
    setAvatarFile(null);
    setAvatarUrl(null);
    setAvatarTouched(true);
    setCropImageSource(null);
    setIsCropEditorOpen(false);
  }

  function closeCropEditor() {
    setIsCropEditorOpen(false);
    setCropImageSource(null);
    setCropZoom(1);
    setCropRotation(0);
    setCropPosition({ x: 0, y: 0 });
    setCroppedAreaPixels(null);
  }

  async function applyAvatarCrop() {
    if (!cropImageSource || !croppedAreaPixels) return;

    setIsCropSaving(true);
    setError(null);
    setNotice(null);

    try {
      const blob = await createCroppedAvatarBlob({
        imageSource: cropImageSource,
        cropPixels: croppedAreaPixels,
        rotation: cropRotation,
      });

      const file = new File([blob], `avatar-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      const uploadedAvatarUrl = await uploadAvatarFile(file);

      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: uploadedAvatarUrl }),
      });
      const payload = (await res.json().catch(() => null)) as
        | { error?: string; profile?: { avatar_url?: string | null } }
        | null;

      if (!res.ok) {
        throw new Error(payload?.error ?? "Could not save profile photo.");
      }

      const finalAvatarUrl = payload?.profile?.avatar_url ?? uploadedAvatarUrl;
      setAvatarUrl(finalAvatarUrl);
      setAvatarFile(null);
      clearAvatarPreview();
      setAvatarTouched(false);
      closeCropEditor();
      setNotice("Profile photo updated.");
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save this profile photo. Please try again."
      );
    } finally {
      setIsCropSaving(false);
    }
  }

  async function uploadAvatarFile(file: File) {
    const formData = new FormData();
    formData.append("file", file, sanitizeFileName(file.name));

    const res = await fetch("/api/profile/avatar", {
      method: "POST",
      body: formData,
    });

    const payload = (await res.json().catch(() => null)) as
      | { error?: string; url?: string }
      | null;

    if (!res.ok || !payload?.url) {
      throw new Error(
        payload?.error ?? "We couldn't upload your photo. Please try again."
      );
    }

    return payload.url;
  }

  async function uploadAvatarIfNeeded() {
    if (!avatarTouched) return avatarUrl;
    if (!avatarFile) return null;
    return uploadAvatarFile(avatarFile);
  }

  async function handleLogout() {
    await fetch("/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const uploadedAvatarUrl = await uploadAvatarIfNeeded();

      const requestBody: Record<string, string | null> = {
        display_name: displayName.trim(),
        username: username.trim() || null,
        bio: bio.trim() || null,
        phone: phone.trim() || null,
        timezone: timezone.trim() || null,
      };

      if (avatarTouched) requestBody.avatar_url = uploadedAvatarUrl ?? null;

      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const payload = (await res.json().catch(() => null)) as
        | { error?: string; profile?: { avatar_url?: string | null; bio?: string | null } }
        | null;

      if (!res.ok) {
        throw new Error(payload?.error ?? "Could not save profile.");
      }

      if (avatarTouched) {
        setAvatarUrl(payload?.profile?.avatar_url ?? uploadedAvatarUrl ?? null);
      }

      if (payload?.profile?.bio !== undefined) {
        setBio(payload.profile.bio ?? "");
      }

      setAvatarFile(null);
      clearAvatarPreview();
      setAvatarTouched(false);
      setNotice("Profile updated.");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save profile.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="qc-card">
      <form onSubmit={handleSave} className="qc-settings-form">
        <section className="qc-settings-section qc-settings-section--account">
          <p className="qc-settings-section-label">Account</p>
          <p className="qc-settings-account-email">{email}</p>
        </section>

        <section className="qc-card qc-card--inset qc-settings-photo-card">
          <div className="qc-settings-section-head">
            <p className="qc-settings-section-label">Profile photo</p>
            <p className="qc-copy">Used on Home and shared surfaces.</p>
          </div>

          <div className="qc-settings-photo-row">
            <span className="qc-settings-avatar">
              {avatarDisplayUrl ? (
                <img src={avatarDisplayUrl} alt="Profile avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="qc-settings-avatar-fallback">No photo</span>
              )}
            </span>

            <div className="qc-settings-photo-controls">
              <input
                ref={avatarInputRef}
                id="settings-avatar"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                onChange={handleAvatarChange}
                className="sr-only"
              />

              <div className="qc-settings-photo-actions">
                <button type="button" onClick={openAvatarPicker} className="qc-button qc-button--primary">
                  {avatarDisplayUrl ? "Change photo" : "Upload photo"}
                </button>

                {(avatarDisplayUrl || avatarTouched) && (
                  <button type="button" onClick={handleRemoveAvatar} className="qc-button qc-button--secondary">
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="qc-settings-section">
          <div className="qc-settings-section-head">
            <p className="qc-settings-section-label">Basic info</p>
          </div>

          <div className="qc-settings-grid qc-settings-grid--2">
            <div className="qc-settings-field">
              <label htmlFor="settings-display-name" className="qc-field-label">
                Display name
              </label>
              <input
                id="settings-display-name"
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="qc-input qc-settings-input"
                required
              />
            </div>

            <div className="qc-settings-field">
              <label htmlFor="settings-username" className="qc-field-label">
                Username
              </label>
              <input
                id="settings-username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Optional"
                className="qc-input qc-settings-input"
              />
            </div>
          </div>

          <div className="qc-settings-grid qc-settings-grid--single">
            <div className="qc-settings-field">
              <label htmlFor="settings-bio" className="qc-field-label">
                Bio
              </label>
              <textarea
                id="settings-bio"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                maxLength={220}
                placeholder="Optional short bio"
                className="qc-textarea qc-settings-textarea"
              />
              <p className="qc-settings-counter">{bio.length}/220</p>
            </div>
          </div>
        </section>

        <section className="qc-settings-section">
          <div className="qc-settings-section-head">
            <p className="qc-settings-section-label">Contact and region</p>
          </div>

          <div className="qc-settings-grid qc-settings-grid--2">
            <div className="qc-settings-field">
              <label htmlFor="settings-phone" className="qc-field-label">
                Phone
              </label>
              <input
                id="settings-phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+1 555 123 4567"
                className="qc-input qc-settings-input"
              />
            </div>

            <div className="qc-settings-field">
              <label htmlFor="settings-timezone" className="qc-field-label">
                Timezone
              </label>
              <select
                id="settings-timezone"
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                className="qc-select qc-settings-input"
              >
                {timezoneOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <div className="qc-settings-timezone-tools">
                <button
                  type="button"
                  onClick={requestTimezoneFromLocation}
                  disabled={timezoneLocationState === "requesting"}
                  className="qc-button qc-button--secondary"
                >
                  {timezoneLocationState === "requesting"
                    ? "Requesting location..."
                    : "Use my location"}
                </button>

                {timezoneLocationMessage && (
                  <p
                    className={`qc-copy ${
                      timezoneLocationState === "denied" ||
                      timezoneLocationState === "error"
                        ? "text-[var(--qc-warning)]"
                        : ""
                    }`}
                  >
                    {timezoneLocationMessage}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="qc-settings-section qc-settings-actions">
          <div className="qc-settings-section-head">
            <p className="qc-settings-section-label">Actions</p>
          </div>

          {error && <p className="qc-status qc-status--danger">{error}</p>}
          {notice && <p className="qc-status qc-status--success">{notice}</p>}

          <div className="qc-settings-action-row">
            <button type="submit" disabled={loading} className="qc-button qc-button--primary">
              {loading ? "Saving..." : "Save profile"}
            </button>
            <button type="button" onClick={handleLogout} className="qc-button qc-button--secondary">
              Logout
            </button>
          </div>
        </section>
      </form>

      {isCropEditorOpen && cropImageSource && (
        <div className="qc-cropper-backdrop" role="dialog" aria-modal="true" aria-label="Edit profile photo">
          <div className="qc-cropper-modal">
            <div className="qc-cropper-head">
              <p className="qc-settings-section-label">Profile photo editor</p>
              <h2 className="qc-heading-sm">Move, zoom, and rotate your photo</h2>
            </div>

            <div className="qc-cropper-stage">
              <Cropper
                image={cropImageSource}
                crop={cropPosition}
                zoom={cropZoom}
                rotation={cropRotation}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCropPosition}
                onZoomChange={setCropZoom}
                onRotationChange={setCropRotation}
                onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
              />
            </div>

            <div className="qc-cropper-controls">
              <label className="qc-cropper-control">
                <span className="qc-field-label">Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={cropZoom}
                  onChange={(event) => setCropZoom(Number(event.target.value))}
                />
              </label>

              <label className="qc-cropper-control">
                <span className="qc-field-label">Rotate</span>
                <input
                  type="range"
                  min={-45}
                  max={45}
                  step={1}
                  value={cropRotation}
                  onChange={(event) => setCropRotation(Number(event.target.value))}
                />
              </label>
            </div>

            <div className="qc-cropper-actions">
              <button
                type="button"
                onClick={closeCropEditor}
                disabled={isCropSaving}
                className="qc-button qc-button--secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyAvatarCrop}
                disabled={isCropSaving}
                className="qc-button qc-button--primary"
              >
                {isCropSaving ? "Saving..." : "Save photo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

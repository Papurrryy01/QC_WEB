"use client";

import {
  type CSSProperties,
  type ClipboardEvent,
  ChangeEvent,
  type DragEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { getTimezoneOptions, toFriendlyTimezoneLabel } from "@/lib/timezone";
import { IconEyeClosed, IconEyeOpen } from "@/app/components/icons/CoolIcons";

type Step = 1 | 2 | 3;
type AccountState = "none" | "verify_email" | "existing_account";
type TimezoneLocationState =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unsupported"
  | "error";

const STEP_COPY: Record<Step, { title: string; subtitle: string }> = {
  1: {
    title: "Create account",
    subtitle: "Start with your login credentials.",
  },
  2: {
    title: "Profile",
    subtitle: "Make the space feel like yours.",
  },
  3: {
    title: "Preferences",
    subtitle: "Set your timezone.",
  },
};

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

function detectTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function PasswordEyeIcon({ visible }: { visible: boolean }) {
  return visible ? <IconEyeOpen /> : <IconEyeClosed />;
}

function blockClipboardAction(event: ClipboardEvent<HTMLFormElement>) {
  event.preventDefault();
}

function blockDropAction(event: DragEvent<HTMLFormElement>) {
  event.preventDefault();
}

export default function SignupPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [accountState, setAccountState] = useState<AccountState>("none");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [timezone, setTimezone] = useState(() => detectTimezone());
  const [timezoneLocationState, setTimezoneLocationState] =
    useState<TimezoneLocationState>("idle");
  const [timezoneLocationMessage, setTimezoneLocationMessage] = useState<string | null>(null);

  const timezoneOptions = useMemo(() => getTimezoneOptions(timezone), [timezone]);
  const activeCopy = STEP_COPY[step];

  const canProceedStep1 = useMemo(
    () =>
      email.trim().length > 0 &&
      password.length >= 8 &&
      confirmPassword.length >= 8 &&
      password === confirmPassword &&
      acceptedLegal,
    [email, password, confirmPassword, acceptedLegal]
  );

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  async function uploadAvatarIfNeeded() {
    if (!avatarFile) return avatarUrl;

    const {
      data: { user },
      error: userError,
    } = await supabaseBrowser.auth.getUser();

    if (userError || !user) {
      throw new Error("Please log in again before uploading a photo.");
    }

    const fileExt = avatarFile.name.split(".").pop() || "jpg";
    const filePath = `${user.id}/${Date.now()}-${sanitizeFileName(
      avatarFile.name.replace(`.${fileExt}`, "")
    )}.${fileExt}`;

    const { error: uploadError } = await supabaseBrowser.storage
      .from("avatars")
      .upload(filePath, avatarFile, { cacheControl: "3600", upsert: true });

    if (uploadError) {
      throw new Error("We couldn't upload your profile photo. You can continue without it.");
    }

    const {
      data: { publicUrl },
    } = supabaseBrowser.storage.from("avatars").getPublicUrl(filePath);

    setAvatarUrl(publicUrl);
    return publicUrl;
  }

  async function saveProfile(payload: {
    display_name?: string;
    username?: string | null;
    avatar_url?: string | null;
    phone?: string | null;
    timezone?: string | null;
    theme_preference?: string | null;
  }) {
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const response = (await res.json().catch(() => null)) as { error?: string } | null;

    if (!res.ok) {
      throw new Error(response?.error ?? "Could not save your profile.");
    }
  }

  async function handleCreateAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    if (!canProceedStep1) {
      if (!acceptedLegal) {
        setError("Please accept Terms and Privacy to create your account.");
      }
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);
    setAccountState("none");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          acceptedLegal: true,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            state?: "verify_email" | "existing_account";
            error?: string;
            message?: string;
          }
        | null;

      if (!response.ok) {
        if (payload?.state === "existing_account") {
          setAccountState("existing_account");
          setNotice(null);
          return;
        }
        throw new Error(payload?.error ?? "Could not create account.");
      }

      if (payload?.state === "existing_account") {
        setAccountState("existing_account");
        setNotice(null);
        return;
      }

      setAccountState("verify_email");
      setNotice(null);
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : "Could not create account.");
    } finally {
      setLoading(false);
    }
  }

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    if (!displayName.trim()) {
      setError("Display name is required.");
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const uploadedAvatarUrl = await uploadAvatarIfNeeded();

      await saveProfile({
        display_name: displayName.trim(),
        username: username.trim() ? username.trim() : null,
        phone: phone.trim() ? phone.trim() : null,
        avatar_url: uploadedAvatarUrl ?? avatarUrl ?? null,
      });

      setStep(3);
      setNotice("Profile saved.");
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : "Could not save profile.");
    } finally {
      setLoading(false);
    }
  }

  function requestTimezoneFromLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      const fallback = detectTimezone();
      setTimezone(fallback);
      setTimezoneLocationState("unsupported");
      setTimezoneLocationMessage(
        `Location is not available in this browser. Timezone set from your device: ${toFriendlyTimezoneLabel(
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

  async function handlePreferencesSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      await saveProfile({
        timezone: timezone.trim() ? timezone.trim() : "UTC",
      });

      router.replace("/app");
      router.refresh();
    } catch (preferencesError) {
      setError(
        preferencesError instanceof Error
          ? preferencesError.message
          : "Could not save preferences."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setAvatarFile(file);
    setAvatarUrl(null);

    if (!file) {
      setAvatarPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
  }

  return (
    <main className="qc-shell">
      <header className="qc-nav">
        <div className="qc-nav-inner">
          <Link href="/" className="qc-logo">
            QC
          </Link>
        </div>
      </header>

      <section className="qc-container qc-section" style={{ maxWidth: "760px" }}>
        <article className="qc-card qc-card--hero">
          <p className="qc-kicker">QC onboarding</p>
          <div className="qc-stepper" style={{ marginTop: "0.6rem" }}>
            <div className="qc-stepper-track" style={{ "--step-count": 3 } as CSSProperties}>
              {[1, 2, 3].map((index) => (
                <span key={index} className={index <= step ? "is-active" : ""} />
              ))}
            </div>
          </div>

          <h1 className="qc-heading-xl" style={{ marginTop: "0.8rem" }}>
            {activeCopy.title}
          </h1>
          <p className="qc-copy">{activeCopy.subtitle}</p>

          {accountState === "existing_account" && (
            <div style={{ marginTop: "1rem" }}>
              <p className="qc-status qc-status--danger">
                This email is already under an account.
              </p>
              <div style={{ marginTop: "0.7rem" }}>
                <Link
                  href={`/login?email=${encodeURIComponent(email.trim())}`}
                  className="qc-button qc-button--secondary"
                >
                  Sign in
                </Link>
              </div>
            </div>
          )}

          {accountState === "verify_email" ? (
            <div className="qc-form-grid" style={{ marginTop: "1rem" }}>
              <p className="qc-copy">
                Check your inbox and verify your email to continue.
              </p>
              <div>
                <Link href="/login" className="qc-button qc-button--primary">
                  Go to login
                </Link>
              </div>
            </div>
          ) : accountState === "existing_account" ? null : (
            <>
              {step === 1 && (
                <form
                  onSubmit={handleCreateAccount}
                  onCopy={blockClipboardAction}
                  onCut={blockClipboardAction}
                  onPaste={blockClipboardAction}
                  onDrop={blockDropAction}
                  className="qc-form-grid"
                  style={{ marginTop: "1rem" }}
                >
                  <div>
                    <label htmlFor="email" className="qc-kicker">Email</label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@email.com"
                      className="qc-input"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="qc-kicker">Password</label>
                    <div className="qc-password-wrap">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        minLength={8}
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="At least 8 characters"
                        className="qc-input qc-input--password"
                      />
                      <button
                        type="button"
                        className="qc-password-toggle"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => setShowPassword((current) => !current)}
                      >
                        <PasswordEyeIcon visible={showPassword} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirm-password" className="qc-kicker">Confirm password</label>
                    <div className="qc-password-wrap">
                      <input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        minLength={8}
                        required
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="Re-enter password"
                        className="qc-input qc-input--password"
                      />
                      <button
                        type="button"
                        className="qc-password-toggle"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        aria-pressed={showConfirmPassword}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => setShowConfirmPassword((current) => !current)}
                      >
                        <PasswordEyeIcon visible={showConfirmPassword} />
                      </button>
                    </div>
                    {confirmPassword.length > 0 && password !== confirmPassword && (
                      <p className="qc-status qc-status--danger" style={{ marginTop: "0.55rem" }}>
                        Passwords do not match.
                      </p>
                    )}
                  </div>

                  <label className="qc-card" style={{ boxShadow: "none" }}>
                    <input
                      type="checkbox"
                      checked={acceptedLegal}
                      onChange={(event) => setAcceptedLegal(event.target.checked)}
                      required
                      style={{ marginRight: "0.6rem" }}
                    />
                    <span className="qc-copy">
                      I agree to the{" "}
                      <Link href="/terms" target="_blank" rel="noreferrer" className="qc-nav-link" style={{ display: "inline-flex" }}>
                        Terms
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" target="_blank" rel="noreferrer" className="qc-nav-link" style={{ display: "inline-flex" }}>
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>

                  <button type="submit" disabled={loading || !canProceedStep1} className="qc-button qc-button--primary">
                    {loading ? "Creating account..." : "Create account"}
                  </button>
                </form>
              )}

              {step === 2 && (
                <form onSubmit={handleProfileSubmit} className="qc-form-grid" style={{ marginTop: "1rem" }}>
                  <div className="qc-form-grid qc-form-grid--2">
                    <div>
                      <label htmlFor="display-name" className="qc-kicker">Display name</label>
                      <input
                        id="display-name"
                        type="text"
                        required
                        value={displayName}
                        onChange={(event) => setDisplayName(event.target.value)}
                        placeholder="Vera"
                        className="qc-input"
                      />
                    </div>

                    <div>
                      <label htmlFor="username" className="qc-kicker">Username</label>
                      <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        placeholder="optional"
                        className="qc-input"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="phone" className="qc-kicker">Phone</label>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="+1 555 123 4567"
                      className="qc-input"
                    />
                  </div>

                  <div>
                    <label htmlFor="avatar" className="qc-kicker">Profile photo</label>
                    <input id="avatar" type="file" accept="image/*" onChange={handleAvatarChange} className="qc-input" />
                    {avatarPreview && (
                      <div className="qc-card" style={{ marginTop: "0.6rem", boxShadow: "none" }}>
                        <img src={avatarPreview} alt="Avatar preview" className="h-10 w-10 rounded-full object-cover" />
                        <p className="qc-copy" style={{ marginTop: "0.5rem" }}>Preview</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => setStep(1)} className="qc-button qc-button--secondary">
                      Back
                    </button>
                    <button type="submit" disabled={loading} className="qc-button qc-button--primary">
                      {loading ? "Saving..." : "Continue"}
                    </button>
                  </div>
                </form>
              )}

              {step === 3 && (
                <form onSubmit={handlePreferencesSubmit} className="qc-form-grid" style={{ marginTop: "1rem" }}>
                  <div>
                    <label htmlFor="timezone" className="qc-kicker">Timezone</label>
                    <select
                      id="timezone"
                      value={timezone}
                      onChange={(event) => setTimezone(event.target.value)}
                      className="qc-select"
                    >
                      {timezoneOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={requestTimezoneFromLocation}
                        disabled={timezoneLocationState === "requesting"}
                        className="qc-button qc-button--secondary"
                      >
                        {timezoneLocationState === "requesting" ? "Requesting location..." : "Use my location"}
                      </button>
                    </div>

                    {timezoneLocationMessage && (
                      <p className="qc-copy" style={{ marginTop: "0.5rem" }}>
                        {timezoneLocationMessage}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => setStep(2)} className="qc-button qc-button--secondary">
                      Back
                    </button>
                    <button type="submit" disabled={loading} className="qc-button qc-button--primary">
                      {loading ? "Finishing..." : "Finish"}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {error && <p className="qc-status qc-status--danger" style={{ marginTop: "0.8rem" }}>{error}</p>}
          {notice && accountState === "none" && (
            <p className="qc-status qc-status--success" style={{ marginTop: "0.8rem" }}>{notice}</p>
          )}

          <p className="qc-copy" style={{ marginTop: "1rem" }}>
            Already have an account?{" "}
            <Link href="/login" className="qc-nav-link" style={{ display: "inline-flex" }}>
              Log in
            </Link>
          </p>
        </article>
      </section>
    </main>
  );
}

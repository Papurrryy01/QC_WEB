"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type PasswordRequirement = {
  key: "length" | "uppercase" | "number" | "special";
  label: string;
  met: boolean;
};

const UPPERCASE_REGEX = /[A-Z]/;
const NUMBER_REGEX = /\d/;
const SPECIAL_REGEX = /[^A-Za-z0-9]/;

function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    { key: "length", label: "At least 8 characters", met: password.length >= 8 },
    {
      key: "uppercase",
      label: "One uppercase letter",
      met: UPPERCASE_REGEX.test(password),
    },
    { key: "number", label: "One number", met: NUMBER_REGEX.test(password) },
    {
      key: "special",
      label: "One special character",
      met: SPECIAL_REGEX.test(password),
    },
  ];
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordHints, setShowPasswordHints] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordRequirements = useMemo(() => getPasswordRequirements(password), [password]);
  const passwordRequirementsMet = passwordRequirements.every((item) => item.met);

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();

      if (!active) return;

      if (!session) {
        setError("Reset link is invalid or expired. Request a new reset email.");
        setReady(false);
        return;
      }

      setError(null);
      setReady(true);
    };

    void checkSession();

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || busy) return;

    setBusy(true);
    setError(null);

    if (!passwordRequirementsMet) {
      setBusy(false);
      setError(
        "Password must include at least 8 characters, one uppercase letter, one number, and one special character."
      );
      return;
    }

    if (password !== confirmPassword) {
      setBusy(false);
      setError("Passwords do not match.");
      return;
    }

    const { error: updateError } = await supabaseBrowser.auth.updateUser({ password });
    if (updateError) {
      setBusy(false);
      setError(updateError.message);
      return;
    }

    await supabaseBrowser.auth.signOut();
    router.replace("/login?reset=1");
  }

  return (
    <main className="auth-page">
      <header className="qc-nav">
        <div className="qc-nav-inner qc-nav-inner--landing">
          <Link href="/" className="qc-logo qc-logo--landing">
            QC
          </Link>
          <nav className="qc-nav-links qc-nav-links--landing" aria-label="Auth navigation">
            <Link href="/forgot-password" className="qc-nav-link">
              Back
            </Link>
          </nav>
        </div>
      </header>

      <section className="auth-shell">
        <article className="auth-card">
          <div className="auth-header">
            <div className="auth-eyebrow">Password reset</div>
            <h1 className="auth-title">Set a new password.</h1>
            <p className="auth-subtitle">Choose a strong password and confirm it below.</p>
          </div>

          <div className="auth-panel">
            {!ready ? (
              <div>
                {error ? <p className="auth-status auth-status--danger">{error}</p> : null}
                <Link
                  href="/forgot-password"
                  className="auth-submit"
                  style={{ display: "inline-grid", placeItems: "center" }}
                >
                  Request new reset link
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="auth-form">
                <div className="auth-field">
                  <label htmlFor="reset-password" className="auth-label">
                    New password
                  </label>
                  <input
                    id="reset-password"
                    type="password"
                    placeholder="At least 8 characters"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onFocus={() => setShowPasswordHints(true)}
                    onBlur={() => setShowPasswordHints(false)}
                    className="auth-input"
                  />
                  {showPasswordHints && (
                    <ul className="auth-hints" aria-live="polite">
                      {passwordRequirements.map((item) => (
                        <li key={item.key} className={item.met ? "is-met" : ""}>
                          {item.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="auth-field">
                  <label htmlFor="reset-confirm-password" className="auth-label">
                    Confirm password
                  </label>
                  <input
                    id="reset-confirm-password"
                    type="password"
                    placeholder="Repeat password"
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="auth-input"
                  />
                </div>

                {error && <p className="auth-status auth-status--danger">{error}</p>}

                <button type="submit" disabled={busy} className="auth-submit">
                  {busy ? "Saving..." : "Update password"}
                </button>
              </form>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}

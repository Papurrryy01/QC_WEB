"use client";

import Link from "next/link";
import { type ClipboardEvent, type DragEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { IconEyeClosed, IconEyeOpen } from "@/app/components/icons/CoolIcons";

type AuthMode = "signin" | "signup";
type NoticeTone = "success" | "warning";
type OAuthProvider = "google";

type SignupResponse = {
  ok?: boolean;
  state?: "verify_email" | "existing_account";
  error?: string;
  message?: string;
};

type PasswordRequirement = {
  key: "length" | "uppercase" | "number" | "special";
  label: string;
  met: boolean;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const UPPERCASE_REGEX = /[A-Z]/;
const NUMBER_REGEX = /\d/;
const SPECIAL_REGEX = /[^A-Za-z0-9]/;
const REMEMBER_ME_KEY = "qc.remember-me";
const BROWSER_SESSION_KEY = "qc.browser-session";
const OAUTH_PRODUCTION_REDIRECT = "https://www.qcapp.co/auth/callback";

const OAUTH_PROVIDERS: { id: OAuthProvider; label: string; className: string }[] = [
  { id: "google", label: "Continue with Google", className: "google" },
];

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

function PasswordEyeIcon({ visible }: { visible: boolean }) {
  return visible ? <IconEyeOpen /> : <IconEyeClosed />;
}

function blockClipboardAction(event: ClipboardEvent<HTMLFormElement>) {
  event.preventDefault();
}

function blockDropAction(event: DragEvent<HTMLFormElement>) {
  event.preventDefault();
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState(() => searchParams.get("email")?.trim() ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showSigninPassword, setShowSigninPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [showPasswordHints, setShowPasswordHints] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(null);

  const passwordRequirements = useMemo(() => getPasswordRequirements(password), [password]);
  const passwordRequirementsMet = passwordRequirements.every((item) => item.met);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    const verified = searchParams.get("verified");
    if (verified === "1") {
      setMode("signin");
      setNotice({
        tone: "success",
        text: "Email verified. Sign in to continue.",
      });
    }

    const reset = searchParams.get("reset");
    if (reset === "1") {
      setMode("signin");
      setNotice({
        tone: "success",
        text: "Password updated. Sign in with your new password.",
      });
    }

    const authError = searchParams.get("error");
    if (authError) {
      setError(authError);
    }
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(REMEMBER_ME_KEY);
    if (saved === "0") {
      setRememberMe(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const forwardIfAuthenticated = async () => {
      if (typeof window !== "undefined") {
        const rememberSetting = window.localStorage.getItem(REMEMBER_ME_KEY);
        const hasBrowserSession = window.sessionStorage.getItem(BROWSER_SESSION_KEY) === "1";
        if (rememberSetting === "0" && !hasBrowserSession) {
          await supabaseBrowser.auth.signOut();
          return;
        }
      }

      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();

      if (active && session) {
        router.refresh();
        router.replace("/dashboard");
      }
    };

    void forwardIfAuthenticated();

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.refresh();
        router.replace("/dashboard");
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  function switchMode(nextMode: AuthMode) {
    if (busy || oauthBusy) return;

    setMode(nextMode);
    setError(null);
    setNotice(null);
    setPassword("");
    setConfirmPassword("");
    setShowSigninPassword(false);
    setShowSignupPassword(false);
    setShowSignupConfirmPassword(false);
    setShowPasswordHints(false);
    setAcceptedLegal(false);
  }

  async function handleOAuthSignIn(provider: OAuthProvider) {
    if (busy || oauthBusy) return;

    setError(null);
    setNotice(null);
    setOauthBusy(provider);

    const redirectTo =
      typeof window !== "undefined"
        ? window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
          ? `${window.location.origin}/auth/callback`
          : OAUTH_PRODUCTION_REDIRECT
        : OAUTH_PRODUCTION_REDIRECT;

    const { error: oauthError } = await supabaseBrowser.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });

    if (oauthError) {
      setOauthBusy(null);
      setError(
        `Could not start ${provider} sign in. Make sure this provider is enabled in your auth settings.`
      );
      return;
    }

    setOauthBusy(null);
  }

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || oauthBusy) return;

    setBusy(true);
    setError(null);
    setNotice(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setBusy(false);
      setError("Please enter a valid email address.");
      return;
    }

    const { data, error: signInError } = await supabaseBrowser.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    setBusy(false);

    if (signInError) {
      const lowerMessage = signInError.message.toLowerCase();
      if (lowerMessage.includes("not confirmed") || lowerMessage.includes("email not confirmed")) {
        setError("Please verify your email before signing in. Check your inbox for the verification link.");
      } else {
        setError(signInError.message);
      }
      return;
    }

    if (!data?.session) {
      setError("Sign in succeeded but no session was created.");
      return;
    }

    if (!data.user?.email_confirmed_at) {
      await supabaseBrowser.auth.signOut();
      setError("Please verify your email before signing in.");
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(REMEMBER_ME_KEY, rememberMe ? "1" : "0");
      if (rememberMe) {
        window.sessionStorage.removeItem(BROWSER_SESSION_KEY);
      } else {
        window.sessionStorage.setItem(BROWSER_SESSION_KEY, "1");
      }
    }

    router.refresh();
    router.push("/dashboard");
  }

  async function handleSignUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || oauthBusy) return;

    setBusy(true);
    setError(null);
    setNotice(null);

    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setBusy(false);
      setError("Please enter a valid email address.");
      return;
    }

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

    if (!acceptedLegal) {
      setBusy(false);
      setError("Please accept Terms and Privacy before creating your account.");
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          acceptedLegal: true,
        }),
      });

      const payload = (await response.json().catch(() => null)) as SignupResponse | null;

      if (!response.ok) {
        if (payload?.state === "existing_account") {
          setMode("signin");
          setNotice({
            tone: "warning",
            text: "This email already has an account. Sign in below.",
          });
          setBusy(false);
          return;
        }

        throw new Error(payload?.error ?? "Could not create account.");
      }

      router.push(`/signup-confirmation?email=${encodeURIComponent(normalizedEmail)}`);
      return;
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : "Could not create account.");
    } finally {
      setBusy(false);
    }
  }

  const noticeClass =
    notice?.tone === "warning"
      ? "auth-status auth-status--warning"
      : "auth-status auth-status--success";

  return (
    <main className="auth-page">
      <header className="qc-nav">
        <div className="qc-nav-inner qc-nav-inner--landing">
          <Link href="/" className="qc-logo qc-logo--landing">
            QC
          </Link>
          <nav className="qc-nav-links qc-nav-links--landing" aria-label="Auth navigation">
            <Link href="/" className="qc-nav-link">
              Back home
            </Link>
          </nav>
        </div>
      </header>

      <section className="auth-shell">
        <article className="auth-card">
          <div className="auth-header">
            <div className="auth-eyebrow">Secure access</div>
            <h1 className="auth-title">Sign in or create your QC account.</h1>
            <p className="auth-subtitle">
              One place to manage your scheduled moments and delivery timeline.
            </p>
          </div>

          <div className="auth-panel">
            <div className="auth-segment" role="tablist" aria-label="Authentication mode">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "signin"}
                className={`auth-segment-btn ${mode === "signin" ? "active" : ""}`}
                onClick={() => switchMode("signin")}
                disabled={Boolean(oauthBusy)}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "signup"}
                className={`auth-segment-btn ${mode === "signup" ? "active" : ""}`}
                onClick={() => switchMode("signup")}
                disabled={Boolean(oauthBusy)}
              >
                Sign up
              </button>
            </div>

            <div className="auth-divider">Or continue with</div>

            <div className="auth-social">
              {OAUTH_PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  className={`auth-social-btn ${provider.className}`}
                  disabled={busy || Boolean(oauthBusy)}
                  onClick={() => handleOAuthSignIn(provider.id)}
                >
                  <span className="auth-social-icon" aria-hidden="true" />
                  {oauthBusy === provider.id ? `Connecting ${provider.id}...` : provider.label}
                </button>
              ))}
            </div>

            {mode === "signin" ? (
              <form onSubmit={handleSignIn} className="auth-form">
                <div className="auth-field">
                  <label htmlFor="signin-email" className="auth-label">
                    Email
                  </label>
                  <input
                    id="signin-email"
                    type="email"
                    placeholder="you@email.com"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="auth-input"
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="signin-password" className="auth-label">
                    Password
                  </label>
                  <div className="auth-password-wrap">
                    <input
                      id="signin-password"
                      type={showSigninPassword ? "text" : "password"}
                      placeholder="Enter password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="auth-input auth-input--password"
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      aria-label={showSigninPassword ? "Hide password" : "Show password"}
                      aria-pressed={showSigninPassword}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => setShowSigninPassword((current) => !current)}
                    >
                      <PasswordEyeIcon visible={showSigninPassword} />
                    </button>
                  </div>
                </div>

                <label className="auth-check">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                  />
                  <span>Remember me on this device</span>
                </label>

                <p className="auth-status" style={{ marginTop: "-4px" }}>
                  <Link href="/forgot-password">Forgot password?</Link>
                </p>

                {error && <p className="auth-status auth-status--danger">{error}</p>}
                {notice && <p className={noticeClass}>{notice.text}</p>}

                <button type="submit" disabled={busy || Boolean(oauthBusy)} className="auth-submit">
                  {busy ? "Signing in..." : "Sign in"}
                </button>
              </form>
            ) : (
              <form
                onSubmit={handleSignUp}
                onCopy={blockClipboardAction}
                onCut={blockClipboardAction}
                onPaste={blockClipboardAction}
                onDrop={blockDropAction}
                className="auth-form"
              >
                <div className="auth-field">
                  <label htmlFor="signup-email" className="auth-label">
                    Email
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    placeholder="you@email.com"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="auth-input"
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="signup-password" className="auth-label">
                    Password
                  </label>
                  <div className="auth-password-wrap">
                    <input
                      id="signup-password"
                      type={showSignupPassword ? "text" : "password"}
                      placeholder="At least 8 characters"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      onFocus={() => setShowPasswordHints(true)}
                      onBlur={() => setShowPasswordHints(false)}
                      className="auth-input auth-input--password"
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      aria-label={showSignupPassword ? "Hide password" : "Show password"}
                      aria-pressed={showSignupPassword}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => setShowSignupPassword((current) => !current)}
                    >
                      <PasswordEyeIcon visible={showSignupPassword} />
                    </button>
                  </div>
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
                  <label htmlFor="signup-confirm-password" className="auth-label">
                    Confirm password
                  </label>
                  <div className="auth-password-wrap">
                    <input
                      id="signup-confirm-password"
                      type={showSignupConfirmPassword ? "text" : "password"}
                      placeholder="Repeat password"
                      required
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="auth-input auth-input--password"
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      aria-label={
                        showSignupConfirmPassword ? "Hide password" : "Show password"
                      }
                      aria-pressed={showSignupConfirmPassword}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() =>
                        setShowSignupConfirmPassword((current) => !current)
                      }
                    >
                      <PasswordEyeIcon visible={showSignupConfirmPassword} />
                    </button>
                  </div>
                </div>

                <label className="auth-check">
                  <input
                    type="checkbox"
                    checked={acceptedLegal}
                    onChange={(event) => setAcceptedLegal(event.target.checked)}
                  />
                  <span>
                    I agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy</Link>.
                  </span>
                </label>

                {error && <p className="auth-status auth-status--danger">{error}</p>}
                {notice && <p className={noticeClass}>{notice.text}</p>}

                <button type="submit" disabled={busy || Boolean(oauthBusy)} className="auth-submit">
                  {busy ? "Creating account..." : "Create account"}
                </button>
              </form>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f6f7fb]" />}>
      <LoginContent />
    </Suspense>
  );
}

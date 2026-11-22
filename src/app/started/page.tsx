"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  ChevronLeft,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type AuthMode = "signin" | "signup" | "magiclink" | "forgot";

export default function StartedPage() {
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) {
        router.push("/dashbord");
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "USER_UPDATED")) {
        router.push("/dashbord");
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [router]);

  const resetState = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleModeChange = (newMode: AuthMode) => {
    resetState();
    setMode(newMode);
  };

  // Sign In with Email & Password
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    resetState();

    if (!email.trim() || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      if (data?.session) {
        setSuccessMsg("Authentication successful. Redirecting to sovereign kernel...");
        setTimeout(() => {
          router.push("/dashbord");
        }, 600);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Sign Up (Create Account)
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetState();

    if (!email.trim() || !password) {
      setErrorMsg("Please provide all required fields.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim() || undefined,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data?.session) {
        setSuccessMsg("Account created successfully! Taking flight...");
        setTimeout(() => {
          router.push("/dashbord");
        }, 800);
      } else if (data?.user) {
        setSuccessMsg(
          "Verification link dispatched! Please check your email to activate your Harpy account."
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Enrollment failed";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Magic Link (Passwordless Sign In)
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    resetState();

    if (!email.trim()) {
      setErrorMsg("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/dashbord`,
        },
      });

      if (error) throw error;

      setSuccessMsg("Instant login link dispatched! Check your email inbox to enter.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Magic link delivery failed";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetState();

    if (!email.trim()) {
      setErrorMsg("Please provide the email associated with your account.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/started?mode=reset`,
      });

      if (error) throw error;

      setSuccessMsg("Password reset instructions dispatched to your email address.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Reset request failed";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth Provider Sign-In
  const handleGoogleSignIn = async () => {
    resetState();
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashbord`,
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google authentication failed";
      setErrorMsg(msg);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050508] text-[#E8DDC7] flex flex-col justify-between selection:bg-[#C6A46A]/30 selection:text-[#E8DDC7] relative overflow-hidden font-inter">
      {/* Subtle Metallic Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(198,164,106,0.06),transparent_70%)]" />
        <div className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-[radial-gradient(circle,rgba(90,36,51,0.08),transparent_70%)]" />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-10 w-full px-6 sm:px-12 py-6 flex items-center justify-between border-b border-[#1A1A24]/60">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-cinzel uppercase tracking-[0.2em] text-[#C6A46A]/80 hover:text-[#C6A46A] transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Return to Portal</span>
        </Link>

        {/* Brand */}
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border border-[#C6A46A]/40 flex items-center justify-center bg-[#0B0B0F] shadow-sm">
            <Image
              src="/images/harpy-logo-light.png"
              alt="HARPY"
              width={22}
              height={22}
              className="object-contain"
            />
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="font-cinzel text-sm tracking-[0.2em] text-[#E8DDC7]">
              HARPY AI
            </span>
          </div>
        </Link>

        <div className="w-24 flex justify-end">
          <span className="text-[11px] font-mono text-[#C6A46A]/50 uppercase tracking-widest hidden sm:inline">
            Auth v2.6
          </span>
        </div>
      </header>

      {/* Main Authentication Card Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-md rounded-2xl bg-[#09090E]/95 border border-[#22222E] shadow-[0_20px_60px_rgba(0,0,0,0.85)] p-6 sm:p-9 backdrop-blur-xl space-y-6"
        >
          {/* Crest & Heading */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full border border-[#C6A46A]/40 flex items-center justify-center mx-auto bg-[#0E0E16] shadow-[0_0_20px_rgba(198,164,106,0.12)]">
              <Image
                src="/images/harpy-logo-light.png"
                alt="Harpy AI"
                width={30}
                height={30}
                className="object-contain"
              />
            </div>
            <h1 className="font-cinzel text-2xl text-[#E8DDC7] tracking-wider pt-1">
              {mode === "signin" && "Operator Sign In"}
              {mode === "signup" && "Initialize Sovereign Account"}
              {mode === "magiclink" && "Passwordless Access"}
              {mode === "forgot" && "Reset Security Credentials"}
            </h1>
            <p className="font-cormorant italic text-base text-[#E8DDC7]/65">
              {mode === "signin" && "Authenticate to resume autonomous multi-app flight."}
              {mode === "signup" && "Empower your workflow across Gmail, Notion, WhatsApp & Code."}
              {mode === "magiclink" && "Receive an encrypted one-time entry token to your inbox."}
              {mode === "forgot" && "Enter your operator email to reset your master passphrase."}
            </p>
          </div>

          {/* Mode Tabs (Sign In / Sign Up / Magic Link) */}
          {mode !== "forgot" && (
            <div className="grid grid-cols-3 p-1 rounded-xl bg-[#0F0F16] border border-[#1C1C28] text-xs font-cinzel">
              <button
                type="button"
                onClick={() => handleModeChange("signin")}
                className={`py-2 rounded-lg tracking-wider transition-all ${
                  mode === "signin"
                    ? "bg-[#181822] text-[#C6A46A] shadow-sm font-semibold border border-[#C6A46A]/30"
                    : "text-[#E8DDC7]/60 hover:text-[#E8DDC7]"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("signup")}
                className={`py-2 rounded-lg tracking-wider transition-all ${
                  mode === "signup"
                    ? "bg-[#181822] text-[#C6A46A] shadow-sm font-semibold border border-[#C6A46A]/30"
                    : "text-[#E8DDC7]/60 hover:text-[#E8DDC7]"
                }`}
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("magiclink")}
                className={`py-2 rounded-lg tracking-wider transition-all ${
                  mode === "magiclink"
                    ? "bg-[#181822] text-[#C6A46A] shadow-sm font-semibold border border-[#C6A46A]/30"
                    : "text-[#E8DDC7]/60 hover:text-[#E8DDC7]"
                }`}
              >
                Magic Link
              </button>
            </div>
          )}

          {/* Feedback Alerts */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-start gap-2.5 leading-relaxed"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            {successMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-2.5 leading-relaxed"
              >
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
                <span>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form Area */}
          <form
            onSubmit={
              mode === "signin"
                ? handleSignIn
                : mode === "signup"
                ? handleSignUp
                : mode === "magiclink"
                ? handleMagicLink
                : handleForgotPassword
            }
            className="space-y-4"
          >
            {/* Full Name (Sign Up only) */}
            {mode === "signup" && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-cinzel tracking-wider uppercase text-[#C6A46A]">
                  Full Name / Operator Handle
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C6A46A]/60" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Athena Vance"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0C0C12] border border-[#20202C] focus:border-[#C6A46A] focus:outline-none text-xs text-[#E8DDC7] placeholder:text-[#E8DDC7]/30 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-cinzel tracking-wider uppercase text-[#C6A46A]">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C6A46A]/60" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@sovereign.harpy.ai"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0C0C12] border border-[#20202C] focus:border-[#C6A46A] focus:outline-none text-xs text-[#E8DDC7] placeholder:text-[#E8DDC7]/30 transition-colors"
                />
              </div>
            </div>

            {/* Password (for signin & signup) */}
            {(mode === "signin" || mode === "signup") && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-cinzel tracking-wider uppercase text-[#C6A46A]">
                    Master Passphrase
                  </label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => handleModeChange("forgot")}
                      className="text-[11px] text-[#C6A46A]/70 hover:text-[#C6A46A] transition-colors"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C6A46A]/60" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#0C0C12] border border-[#20202C] focus:border-[#C6A46A] focus:outline-none text-xs text-[#E8DDC7] placeholder:text-[#E8DDC7]/30 transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#E8DDC7]/40 hover:text-[#C6A46A] p-1"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm Password (signup only) */}
            {mode === "signup" && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-cinzel tracking-wider uppercase text-[#C6A46A]">
                  Confirm Passphrase
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C6A46A]/60" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0C0C12] border border-[#20202C] focus:border-[#C6A46A] focus:outline-none text-xs text-[#E8DDC7] placeholder:text-[#E8DDC7]/30 transition-colors font-mono"
                  />
                </div>
              </div>
            )}

            {/* Remember device checkbox */}
            {mode === "signin" && (
              <div className="flex items-center gap-2 pt-1 text-xs text-[#E8DDC7]/70 font-light">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-[#0C0C12] border-[#20202C] text-[#C6A46A] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#C6A46A]"
                />
                <label htmlFor="remember" className="cursor-pointer">
                  Persist session on this sovereign terminal
                </label>
              </div>
            )}

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#C6A46A] text-[#050508] font-cinzel text-xs tracking-[0.2em] uppercase font-semibold hover:bg-[#E2C99A] active:scale-[0.99] transition-all duration-200 shadow-[0_4px_20px_rgba(198,164,106,0.2)] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#050508] border-t-transparent rounded-full animate-spin" />
                  <span>Authorizing...</span>
                </>
              ) : (
                <>
                  <span>
                    {mode === "signin" && "Authenticate & Enter"}
                    {mode === "signup" && "Create Harpy Account"}
                    {mode === "magiclink" && "Dispatch Magic Link"}
                    {mode === "forgot" && "Send Reset Link"}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Social Auth Divider */}
          {mode !== "forgot" && (
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#1C1C28]" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-cinzel tracking-widest">
                <span className="bg-[#09090E] px-3 text-[#E8DDC7]/40">or continue with</span>
              </div>
            </div>
          )}

          {/* Google OAuth Button */}
          {mode !== "forgot" && (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0D0D14] border border-[#222230] hover:border-[#C6A46A]/50 text-[#E8DDC7] hover:text-[#C6A46A] text-xs font-cinzel tracking-wider uppercase flex items-center justify-center gap-3 transition-all duration-200"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.7 2.9C6.5 7.4 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.7c-.2-.7-.4-1.5-.4-2.7s.2-2 .4-2.7L1.9 6.4C.7 8.8 0 10.8 0 12s.7 3.2 1.9 5.6l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.3L1.9 15.9C3.7 19.7 7.5 23 12 23z"
                />
              </svg>
              <span>{googleLoading ? "Connecting..." : "Google Workspace Account"}</span>
            </button>
          )}

          {/* Mode Footer Switching */}
          <div className="pt-2 text-center text-xs font-light text-[#E8DDC7]/60">
            {mode === "signin" && (
              <p>
                New operator?{" "}
                <button
                  type="button"
                  onClick={() => handleModeChange("signup")}
                  className="text-[#C6A46A] underline decoration-[#C6A46A]/40 hover:text-[#E2C99A] font-medium"
                >
                  Create an account
                </button>
              </p>
            )}

            {mode === "signup" && (
              <p>
                Already have an operator credential?{" "}
                <button
                  type="button"
                  onClick={() => handleModeChange("signin")}
                  className="text-[#C6A46A] underline decoration-[#C6A46A]/40 hover:text-[#E2C99A] font-medium"
                >
                  Sign in
                </button>
              </p>
            )}

            {mode === "magiclink" && (
              <p>
                Prefer password authorization?{" "}
                <button
                  type="button"
                  onClick={() => handleModeChange("signin")}
                  className="text-[#C6A46A] underline decoration-[#C6A46A]/40 hover:text-[#E2C99A] font-medium"
                >
                  Sign in with passphrase
                </button>
              </p>
            )}

            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => handleModeChange("signin")}
                className="text-[#C6A46A] inline-flex items-center gap-1 hover:text-[#E2C99A]"
              >
                <span>← Back to operator sign in</span>
              </button>
            )}
          </div>
        </motion.div>
      </main>

      {/* Footer info */}
      <footer className="relative z-10 py-6 text-center text-[11px] font-mono text-[#E8DDC7]/40 border-t border-[#14141C]">
        <span>Protected by Supabase Encrypted Cryptographic Invariants &amp; Row Level Security.</span>
      </footer>
    </div>
  );
}

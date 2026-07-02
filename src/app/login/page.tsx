"use client";

import { useState } from "react";
import { Swords, Mail, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("sending");
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
      },
    });

    if (signInError) {
      setStatus("error");
      setError(signInError.message);
      return;
    }

    setStatus("sent");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-3">
            <Swords size={22} className="text-primary" />
          </div>
          <h1 className="font-display font-bold text-2xl text-text-hi">Evolvr</h1>
          <p className="text-sm text-text-mid mt-1 text-center">Transform your life like an RPG character.</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          {status === "sent" ? (
            <div className="flex flex-col items-center text-center gap-3 py-2">
              <CheckCircle2 size={32} className="text-success" />
              <p className="text-sm font-medium text-text-hi">Check your email</p>
              <p className="text-xs text-text-mid">
                We sent a sign-in link to <span className="text-text-hi">{email}</span>. Open it on this device to
                continue.
              </p>
              <button
                onClick={() => setStatus("idle")}
                className="text-xs text-primary hover:text-primary/80 mt-1"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <label className="text-xs text-text-mid">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-low" />
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-bg-elevated border border-border-soft rounded-lg pl-9 pr-3 py-2.5 text-sm text-text-hi placeholder:text-text-low focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              {error && <p className="text-xs text-danger">{error}</p>}

              <button
                type="submit"
                disabled={status === "sending"}
                className="mt-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                {status === "sending" ? "Sending..." : "Send me a sign-in link"}
              </button>

              <p className="text-[11px] text-text-low text-center mt-1">
                No password needed — first time here creates your account automatically.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

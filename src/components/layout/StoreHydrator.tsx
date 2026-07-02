"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEvolvrStore } from "@/lib/store";
import { Swords } from "lucide-react";

export function StoreHydrator({ children }: { children: React.ReactNode }) {
  const isHydrated = useEvolvrStore((s) => s.isHydrated);
  const isLoading = useEvolvrStore((s) => s.isLoading);
  const hydrationError = useEvolvrStore((s) => s.hydrationError);
  const hydrate = useEvolvrStore((s) => s.hydrate);
  const router = useRouter();

  // Fix 1: guard on hydrationError so a failed hydration attempt doesn't
  // immediately re-trigger itself (isLoading goes false → effect fires again
  // before the component can re-render with the error state shown).
  useEffect(() => {
    if (!isHydrated && !isLoading && !hydrationError) {
      hydrate();
    }
  }, [isHydrated, isLoading, hydrationError, hydrate]);

  // If not signed in, middleware should have already redirected to /login.
  // This is a fallback in case middleware's Supabase call failed silently —
  // show the login redirect rather than a confusing "couldn't load data" error.
  useEffect(() => {
    if (hydrationError === "Not signed in") {
      router.replace("/login");
    }
  }, [hydrationError, router]);

  if (hydrationError && hydrationError !== "Not signed in") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-10 h-10 rounded-xl bg-danger/10 border border-danger/30 flex items-center justify-center mx-auto mb-4">
            <Swords size={18} className="text-danger" />
          </div>
          <p className="text-sm font-medium text-text-hi mb-1">Couldn&apos;t load your data</p>
          <p className="text-xs text-text-mid mb-4">{hydrationError}</p>
          <button
            onClick={() => {
              // Reset error state before retrying so the Fix 1 guard allows
              // hydrate() to run again.
              useEvolvrStore.setState({ hydrationError: null });
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center animate-pulse">
            <Swords size={18} className="text-primary" />
          </div>
          <p className="text-xs text-text-low">Loading your progress...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

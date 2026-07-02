"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Dumbbell, BookOpen, ListChecks, BarChart3, UserCircle2, Swords, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEvolvrStore } from "@/lib/store";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/gym", label: "Gym", icon: Dumbbell },
  { href: "/study", label: "Study", icon: BookOpen },
  { href: "/habits", label: "Habits", icon: ListChecks },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/profile", label: "Profile", icon: UserCircle2 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 md:left-0 border-r border-border bg-bg-elevated/60 backdrop-blur-sm px-4 py-6">
      <div className="flex items-center gap-2 px-2 mb-10">
        <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
          <Swords size={18} className="text-primary" />
        </div>
        <span className="font-display font-bold text-lg tracking-tight text-text-hi">Evolvr</span>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                active
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-text-mid hover:text-text-hi hover:bg-card"
              )}
            >
              <Icon size={18} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2">
        <SignedInAs />
      </div>
    </aside>
  );
}

function SignedInAs() {
  const displayName = useEvolvrStore((s) => s.displayName);
  const signOut = useEvolvrStore((s) => s.signOut);

  return (
    <div className="px-3 py-3 rounded-lg bg-card border border-border-soft flex items-center justify-between gap-2">
      <p className="text-xs text-text-mid truncate">
        Signed in as <span className="text-text-hi font-medium">{displayName}</span>
      </p>
      <button onClick={() => signOut()} className="text-text-low hover:text-danger shrink-0" aria-label="Sign out">
        <LogOut size={15} />
      </button>
    </div>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-bg-elevated/95 backdrop-blur-sm border-t border-border flex justify-around px-2 py-2">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[11px] font-medium",
              active ? "text-primary" : "text-text-low"
            )}
          >
            <Icon size={20} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Evolvr — Transform your life like an RPG character",
  description: "Every action in real life contributes to stats, XP, rank, and progression.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

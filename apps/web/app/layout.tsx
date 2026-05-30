import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";

import { AiHelperShell } from "@/components/ai-helper/shell";
import { AppNavShell } from "@/components/app-nav-shell";
import { SettingsGearShell } from "@/components/settings-gear-shell";
import { clerkConfigured } from "@/lib/env";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GrowthOS",
  description: "Social media marketing without the marketing degree",
};

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-50`}
      >
        {!clerkConfigured ? (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
            Clerk is not configured — copy <code>.env.example</code> to{" "}
            <code>apps/web/.env.local</code> and add your API keys.
          </div>
        ) : null}
        <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-8">
              <Link href="/" className="text-lg font-semibold tracking-tight">
                GrowthOS
              </Link>
              {clerkConfigured ? (
                <SignedIn>
                  <AppNavShell />
                </SignedIn>
              ) : (
                <AppNavShell />
              )}
            </div>
            <div className="flex items-center gap-3">
              {clerkConfigured ? (
                <>
                  <SignedOut>
                    <SignInButton mode="modal">
                      <button className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300">
                        Sign in
                      </button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <button className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                        Start free trial
                      </button>
                    </SignUpButton>
                  </SignedOut>
                  <SignedIn>
                    <SettingsGearShell />
                    <UserButton afterSignOutUrl="/" />
                  </SignedIn>
                </>
              ) : (
                <>
                  <SettingsGearShell />
                  <Link
                    href="/get-started"
                    className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Get started
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <AiHelperShell />
      </body>
    </html>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!clerkConfigured) {
    return <AppShell>{children}</AppShell>;
  }

  return <ClerkProvider><AppShell>{children}</AppShell></ClerkProvider>;
}

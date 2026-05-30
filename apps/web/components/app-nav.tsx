"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AppNavProps = {
  onboardingComplete?: boolean;
};

const links = [
  { href: "/create", label: "Create" },
  { href: "/leads", label: "Leads" },
  { href: "/auto-replies", label: "Auto-Replies" },
  { href: "/analytics", label: "Analytics" },
  { href: "/get-started", label: "Get Started", hideWhenOnboarded: true },
];

export function AppNav({ onboardingComplete = false }: AppNavProps) {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-5 text-sm font-medium text-slate-600 md:flex dark:text-slate-300">
      {links
        .filter((link) => !(link.hideWhenOnboarded && onboardingComplete))
        .map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(`${link.href}/`);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={
                active
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "hover:text-emerald-600 dark:hover:text-emerald-400"
              }
            >
              {link.label}
            </Link>
          );
        })}
    </nav>
  );
}

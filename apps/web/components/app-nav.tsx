"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AppNavProps = {
  onboardingComplete?: boolean;
};

type AppNavLink = {
  href: string;
  label: string;
};

// Product nav. Only rendered once the tenant finishes the Get Started wizard;
// before that, first-time visitors get only the landing-page CTA button.
const productLinks: AppNavLink[] = [
  { href: "/create", label: "Create" },
  { href: "/leads", label: "Leads" },
  { href: "/auto-replies", label: "Auto-Replies" },
  { href: "/analytics", label: "Analytics" },
];

export function AppNav({ onboardingComplete = false }: AppNavProps) {
  const pathname = usePathname();

  if (!onboardingComplete) {
    return null;
  }

  return (
    <nav className="hidden items-center gap-5 text-sm font-medium text-slate-600 md:flex dark:text-slate-300">
      {productLinks.map((link) => {
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

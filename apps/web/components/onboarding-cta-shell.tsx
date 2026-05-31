import Link from "next/link";

import { getOnboardingState } from "@/lib/onboarding-state";

// Header CTA that surfaces a "Finish setup" pill for signed-in users who
// haven't completed the onboarding wizard. Rendered inside <SignedIn /> in
// the layout, so it never shows for anonymous visitors.
//
// Important: this component only reuses getOnboardingState() — which is
// already pulled into the layout's trace by AppNavShell, SettingsGearShell,
// and AiHelperShell — so adding it does NOT widen any serverless function's
// dependency graph (we're at Vercel's 250 MB per-function limit and any new
// direct imports of @clerk/nextjs/server in widely-used components can push
// us over).
export async function OnboardingCtaShell() {
  const { onboardingComplete } = await getOnboardingState();
  if (onboardingComplete) {
    return null;
  }

  return (
    <Link
      href="/get-started"
      className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
    >
      Finish setup
    </Link>
  );
}

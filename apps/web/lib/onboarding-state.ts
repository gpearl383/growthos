import { auth } from "@clerk/nextjs/server";
import { cache } from "react";

import { clerkConfigured, dbConfigured } from "@/lib/env";
import { getOrCreateTenant } from "@/lib/tenant";

export type OnboardingState = {
  onboardingComplete: boolean;
  signedIn: boolean;
};

// Shared gate used by the layout chrome (nav, settings gear, AI helper bubble,
// landing page CTAs) so every entry point treats "is this tenant onboarded?"
// the same way. Defaults to `onboardingComplete: false` whenever we can't
// answer confidently (signed-out under Clerk, DB unreachable, no tenant row
// yet) so the locked-down UI is shown until onboarding is explicitly complete.
//
// Also returns `signedIn` so consumers can distinguish "signed-out marketing
// visitor" from "signed-in user mid-setup" — the landing page needs that to
// redirect new accounts into /get-started instead of rendering a dead-end
// hero.
//
// Wrapped in React `cache()` so a single request renders without N round-trips
// when multiple consumers (AppNavShell, SettingsGearShell, AiHelperShell, the
// landing page) ask in the same render.
export const getOnboardingState = cache(async (): Promise<OnboardingState> => {
  let signedIn = false;
  if (clerkConfigured) {
    try {
      const { userId } = await auth();
      signedIn = Boolean(userId);
    } catch {
      signedIn = false;
    }
  } else {
    // In local-dev mode without Clerk, treat the request as signed-in so the
    // app behaves as a single-tenant install.
    signedIn = true;
  }

  if (!dbConfigured) {
    return { onboardingComplete: false, signedIn };
  }

  try {
    const tenant = await getOrCreateTenant();
    return { onboardingComplete: tenant.onboardingComplete, signedIn };
  } catch {
    return { onboardingComplete: false, signedIn };
  }
});

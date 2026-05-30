import { cache } from "react";

import { dbConfigured } from "@/lib/env";
import { getOrCreateTenant } from "@/lib/tenant";

export type OnboardingState = {
  onboardingComplete: boolean;
};

// Shared gate used by the layout chrome (nav, settings gear, AI helper bubble,
// landing page CTAs) so every entry point treats "is this tenant onboarded?"
// the same way. Defaults to `false` whenever we can't answer confidently
// (signed-out under Clerk, DB unreachable, no tenant row yet) so the locked-
// down UI is shown until onboarding is explicitly complete.
//
// Wrapped in React `cache()` so a single request renders without N round-trips
// when multiple consumers (AppNavShell, SettingsGearShell, AiHelperShell, the
// landing page) ask in the same render.
export const getOnboardingState = cache(async (): Promise<OnboardingState> => {
  if (!dbConfigured) {
    return { onboardingComplete: false };
  }

  try {
    const tenant = await getOrCreateTenant();
    return { onboardingComplete: tenant.onboardingComplete };
  } catch {
    return { onboardingComplete: false };
  }
});

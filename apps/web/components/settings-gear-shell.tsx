import { getOnboardingState } from "@/lib/onboarding-state";

import { SettingsGear } from "./settings-gear";

export async function SettingsGearShell() {
  const { onboardingComplete } = await getOnboardingState();

  if (!onboardingComplete) {
    return null;
  }

  return <SettingsGear />;
}

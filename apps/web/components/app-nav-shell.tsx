import { getOnboardingState } from "@/lib/onboarding-state";

import { AppNav } from "./app-nav";

export async function AppNavShell() {
  const { onboardingComplete } = await getOnboardingState();
  return <AppNav onboardingComplete={onboardingComplete} />;
}

import { dbConfigured } from "@/lib/env";
import { getOrCreateTenant } from "@/lib/tenant";

import { AppNav } from "./app-nav";

export async function AppNavShell() {
  if (!dbConfigured) {
    return <AppNav />;
  }

  try {
    const tenant = await getOrCreateTenant();
    return <AppNav onboardingComplete={tenant.onboardingComplete} />;
  } catch {
    return <AppNav />;
  }
}

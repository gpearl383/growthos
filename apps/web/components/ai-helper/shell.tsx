import { AiHelperChat } from "@/components/ai-helper/chat";
import { dbConfigured } from "@/lib/env";
import { getOrCreateTenant } from "@/lib/tenant";

export async function AiHelperShell() {
  if (!dbConfigured) {
    return null;
  }

  try {
    const tenant = await getOrCreateTenant();

    if (!tenant.onboardingComplete) {
      return null;
    }

    return <AiHelperChat />;
  } catch {
    return null;
  }
}

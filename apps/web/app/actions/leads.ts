"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { deleteLead, updateLeadStatus, type LeadStatus } from "@/lib/leads";
import { dbConfigured } from "@/lib/env";
import { getOrCreateTenant } from "@/lib/tenant";

const statusSchema = z.enum([
  "new",
  "contacted",
  "booked",
  "won",
  "lost",
  "archived",
]);

export async function setLeadStatus(formData: FormData) {
  if (!dbConfigured) {
    return;
  }

  const leadId = formData.get("leadId");
  const status = formData.get("status");

  const parsed = z
    .object({ leadId: z.string().uuid(), status: statusSchema })
    .safeParse({
      leadId,
      status,
    });

  if (!parsed.success) {
    return;
  }

  const tenant = await getOrCreateTenant();
  const updated = await updateLeadStatus(
    tenant.id,
    parsed.data.leadId,
    parsed.data.status as LeadStatus,
  );

  if (!updated) {
    return;
  }

  revalidatePath("/leads");
  redirect("/leads?updated=1");
}

export async function removeLead(formData: FormData) {
  if (!dbConfigured) {
    return;
  }

  const parsed = z
    .object({ leadId: z.string().uuid() })
    .safeParse({ leadId: formData.get("leadId") });

  if (!parsed.success) {
    return;
  }

  const tenant = await getOrCreateTenant();
  const deleted = await deleteLead(tenant.id, parsed.data.leadId);

  if (!deleted) {
    return;
  }

  revalidatePath("/leads");
  redirect("/leads?deleted=1");
}

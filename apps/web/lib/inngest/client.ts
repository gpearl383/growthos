import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "growthos" });

export async function emitLeadCreated(input: {
  leadId: string;
  tenantId: string;
}) {
  try {
    await inngest.send({
      name: "growthos/lead.created",
      data: input,
    });
  } catch {
    // Inngest may be unavailable in local dev without the dev server.
  }
}

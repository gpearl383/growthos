import { Resend } from "resend";

import { resendConfigured, resendFromAddress } from "@/lib/env";

export async function sendNewLeadEmail(input: {
  to: string;
  businessName: string;
  leadName: string;
  leadPhone?: string | null;
  leadEmail?: string | null;
  source: string;
  leadsUrl: string;
}) {
  if (!resendConfigured) {
    return { skipped: true as const };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const contactLines = [
    input.leadPhone ? `Phone: ${input.leadPhone}` : null,
    input.leadEmail ? `Email: ${input.leadEmail}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  await resend.emails.send({
    from: resendFromAddress(),
    to: input.to,
    subject: `New lead for ${input.businessName}`,
    text: `You have a new lead from ${input.source}.\n\nName: ${input.leadName}\n${contactLines}\n\nView in GrowthOS: ${input.leadsUrl}`,
  });

  return { sent: true as const };
}

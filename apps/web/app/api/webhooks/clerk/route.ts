import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { syncTenantFromClerkOrg } from "@/lib/tenant";

type ClerkOrganizationEvent = {
  type: string;
  data: {
    id: string;
    name: string;
    slug?: string | null;
  };
};

export async function POST(request: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "CLERK_WEBHOOK_SECRET is not configured" },
      { status: 500 },
    );
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing Svix headers" }, { status: 400 });
  }

  const payload = await request.text();
  const webhook = new Webhook(secret);

  let event: ClerkOrganizationEvent;
  try {
    event = webhook.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkOrganizationEvent;
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  if (
    event.type === "organization.created" ||
    event.type === "organization.updated"
  ) {
    await syncTenantFromClerkOrg({
      clerkOrgId: event.data.id,
      name: event.data.name,
      slug: event.data.slug,
    });
  }

  return NextResponse.json({ ok: true });
}

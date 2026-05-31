import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createCanvaDesign,
  PLATFORM_CANVAS_SIZE,
} from "@/lib/canva/config";
import { canvaConfigured, dbConfigured } from "@/lib/env";
import { requireTenant } from "@/lib/api";

const bodySchema = z.object({
  platform: z.enum(["instagram", "facebook", "tiktok"]),
  title: z.string().trim().optional(),
});

export async function POST(request: Request) {
  if (!dbConfigured) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 },
    );
  }

  if (!canvaConfigured) {
    return NextResponse.json(
      { error: "Add CANVA_CLIENT_ID and CANVA_CLIENT_SECRET to use Canva." },
      { status: 503 },
    );
  }

  const tenant = await requireTenant();
  if (tenant instanceof Response) return tenant;
  if (!tenant.onboardingComplete) {
    return NextResponse.json(
      { error: "Complete onboarding first." },
      { status: 403 },
    );
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(`canva_access_token_${tenant.id}`)?.value;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Connect Canva first.", needsAuth: true },
      { status: 401 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const size = PLATFORM_CANVAS_SIZE[parsed.data.platform];

  try {
    const design = await createCanvaDesign({
      accessToken,
      title: parsed.data.title || `${tenant.businessName ?? "GrowthOS"} post`,
      width: size.width,
      height: size.height,
    });

    return NextResponse.json({
      designId: design.id,
      editUrl: design.urls?.edit_url ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create design.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

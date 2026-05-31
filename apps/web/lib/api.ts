import { NextResponse } from "next/server";

import { AuthError, getOrCreateTenant, type TenantRecord } from "@/lib/tenant";

// Returns the tenant for the active session, or a 401 NextResponse.
// Use in JSON API routes instead of getOrCreateTenant() directly so that
// unauthenticated requests get a proper 401 rather than an unhandled 500.
export async function requireTenant(): Promise<TenantRecord | NextResponse> {
  try {
    return await getOrCreateTenant();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw err;
  }
}

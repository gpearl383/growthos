import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";

import { clerkConfigured } from "@/lib/env";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/p/(.*)",
  "/api/inngest(.*)",
  "/api/leads(.*)",
  "/api/webhooks/(.*)",
]);

const isProd =
  process.env.NODE_ENV === "production" ||
  process.env.VERCEL_ENV === "production";

export default clerkConfigured
  ? clerkMiddleware(async (auth, request) => {
      if (!isPublicRoute(request)) {
        await auth.protect();
      }
    })
  : (request: NextRequest) => {
      // Clerk is not configured. In production this is a misconfig — fail closed
      // so a missing env var doesn't silently remove all auth. In local dev,
      // pass through so the app works without Clerk credentials.
      if (isProd && !isPublicRoute(request)) {
        return NextResponse.json(
          { error: "Authentication is not configured." },
          { status: 503 },
        );
      }
      return NextResponse.next();
    };

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

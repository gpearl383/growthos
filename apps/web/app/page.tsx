import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@growthos/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@growthos/ui/card";

import { getOnboardingState } from "@/lib/onboarding-state";

export default async function HomePage() {
  const { onboardingComplete, signedIn } = await getOnboardingState();

  // First-run flow: a signed-in user who hasn't finished the wizard has no
  // sensible reason to sit on the marketing page. The signed-out header CTAs
  // (Sign in / Start free trial) are hidden by Clerk's <SignedOut /> guard
  // once they authenticate, so without this redirect they'd land here with
  // no way forward. Send them straight to /get-started.
  if (signedIn && !onboardingComplete) {
    redirect("/get-started");
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-600">
          Owner-first social marketing
        </p>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Social media marketing without the marketing degree
        </h1>
        <p className="max-w-2xl text-lg text-slate-600 dark:text-slate-300">
          Guided setup, AI content, automatic lead pages, DM auto-replies, and a
          simple leads inbox — built for busy small business owners.
        </p>
        {onboardingComplete ? (
          <div className="flex flex-wrap gap-3">
            <Link href="/leads">
              <Button size="lg">View leads inbox</Button>
            </Link>
          </div>
        ) : signedIn ? (
          // Safety net: if a signed-in/not-onboarded user somehow bypasses the
          // redirect above (e.g. browser back button, prefetched cache), still
          // give them one visible next step.
          <div className="flex flex-wrap gap-3">
            <Link href="/get-started">
              <Button size="lg">Finish setting up</Button>
            </Link>
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Get Started wizard",
            description:
              "Tell us your business and goal — we set up your first lead page.",
          },
          {
            title: "Create & post",
            description:
              "AI writes captions and hooks. Schedule or copy-to-post for Instagram, Facebook, and TikTok.",
          },
          {
            title: "Leads inbox",
            description:
              "Every form fill, DM, and booking lands in one plain-English inbox.",
          },
        ].map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle className="text-lg">{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>
    </div>
  );
}

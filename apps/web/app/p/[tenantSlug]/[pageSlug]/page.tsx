import { notFound } from "next/navigation";
import { Button } from "@growthos/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@growthos/ui/card";

import { getPublishedLeadPage } from "@/lib/lead-pages";

type LeadPageProps = {
  params: Promise<{ tenantSlug: string; pageSlug: string }>;
  searchParams: Promise<{ thanks?: string; error?: string }>;
};

type LeadPageContent = {
  headline?: string;
  subhead?: string;
  cta?: string;
};

export default async function PublicLeadPage({
  params,
  searchParams,
}: LeadPageProps) {
  const { tenantSlug, pageSlug } = await params;
  const query = await searchParams;

  let result = null;
  try {
    result = await getPublishedLeadPage(tenantSlug, pageSlug);
  } catch {
    notFound();
  }

  if (!result) {
    notFound();
  }

  const content = (result.page.contentJson ?? {}) as LeadPageContent;
  const headline =
    content.headline ?? result.tenant.businessName ?? "Get in touch";
  const subhead =
    content.subhead ??
    result.tenant.offerText ??
    "Tell us how we can help and we'll get back to you soon.";
  const cta = content.cta ?? "Get in touch";

  if (query.thanks === "1") {
    return (
      <div className="-mx-4 -my-8 min-h-[calc(100vh-5rem)] bg-slate-50 px-4 py-12 dark:bg-slate-950">
        <div className="mx-auto max-w-lg">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Thanks — we got it!</CardTitle>
              <CardDescription className="text-base">
                {result.tenant.businessName ?? "We'll"} be in touch soon.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center text-sm text-slate-600 dark:text-slate-300">
              You can close this page. If you need anything urgent, call or text
              the business directly.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="-mx-4 -my-8 min-h-[calc(100vh-5rem)] bg-slate-50 px-4 py-12 dark:bg-slate-950">
      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{headline}</CardTitle>
            <CardDescription className="text-base">{subhead}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {query.error === "1" ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                Please enter your name and try again.
              </p>
            ) : null}
            <form action="/api/leads" method="post" className="space-y-3">
              <input type="hidden" name="tenantSlug" value={tenantSlug} />
              <input type="hidden" name="pageSlug" value={pageSlug} />
              <label className="block space-y-1 text-sm">
                <span>Name</span>
                <input
                  name="name"
                  required
                  className="w-full rounded-md border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>Email</span>
                <input
                  name="email"
                  type="email"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>Phone</span>
                <input
                  name="phone"
                  type="tel"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
              <Button type="submit" className="w-full">
                {cta}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@growthos/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@growthos/ui/card";

import {
  completeOnboarding,
  type OnboardingActionState,
} from "@/app/actions/onboarding";
import {
  BUSINESS_TYPES,
  buildLeadPageContent,
  GOAL_OPTIONS,
  goalToTemplate,
  type BusinessType,
  type TenantGoal,
} from "@/lib/onboarding/constants";
import { appUrl } from "@/lib/env-client";
import { slugify } from "@/lib/slug";

const initialState: OnboardingActionState = {};

type GetStartedWizardProps = {
  tenantSlug: string;
  initialBusinessName?: string | null;
};

const STEPS = [
  "Your business",
  "Your goal",
  "Your offer",
  "Photos",
  "Launch page",
] as const;

export function GetStartedWizard({
  tenantSlug,
  initialBusinessName = "",
}: GetStartedWizardProps) {
  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState(initialBusinessName ?? "");
  const [businessType, setBusinessType] = useState<BusinessType>("local_services");
  const [goal, setGoal] = useState<TenantGoal>("bookings");
  const [offerText, setOfferText] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [photoUrls, setPhotoUrls] = useState("");

  const [state, formAction, pending] = useActionState(
    completeOnboarding,
    initialState,
  );

  const template = goalToTemplate(goal);
  const preview = useMemo(
    () =>
      buildLeadPageContent({
        businessName: businessName || "Your business",
        offerText,
        goal,
        template,
      }),
    [businessName, offerText, goal, template],
  );

  const previewSlug = slugify(businessName) || tenantSlug;
  const leadPagePath = `/p/${previewSlug}/offer`;
  const leadPageUrl = `${appUrl()}${leadPagePath}`;

  function canContinue() {
    switch (step) {
      case 0:
        return businessName.trim().length >= 2;
      case 1:
        return Boolean(goal);
      case 2:
        return offerText.trim().length >= 10;
      case 3:
        return true;
      default:
        return true;
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-emerald-600">
          Step {step + 1} of {STEPS.length}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Get started</h1>
        <p className="text-slate-600 dark:text-slate-300">
          Answer a few plain-English questions and we&apos;ll set up your first
          lead page.
        </p>
      </div>

      <div className="flex gap-2">
        {STEPS.map((label, index) => (
          <div
            key={label}
            className={`h-2 flex-1 rounded-full ${
              index <= step ? "bg-emerald-600" : "bg-slate-200 dark:bg-slate-800"
            }`}
            aria-hidden
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{STEPS[step]}</CardTitle>
          <CardDescription>
            {step === 0 && "What should we call your business?"}
            {step === 1 && "What do you want social media to do for you?"}
            {step === 2 && "Describe your offer in one sentence customers understand."}
            {step === 3 && "Optional for now — paste image URLs if you have them."}
            {step === 4 && "Preview what customers will see when they click your link."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 0 ? (
            <div className="space-y-6">
              <label className="block space-y-2 text-sm">
                <span className="font-medium">Business name</span>
                <input
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                  placeholder="Acme HVAC"
                />
              </label>
              <div className="space-y-3">
                <p className="text-sm font-medium">Business type</p>
                <div className="grid gap-3">
                  {BUSINESS_TYPES.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setBusinessType(option.value)}
                      className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                        businessType === option.value
                          ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
                          : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                      }`}
                    >
                      <p className="font-medium">{option.label}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {option.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-3">
              {GOAL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setGoal(option.value)}
                  className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                    goal === option.value
                      ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                  }`}
                >
                  <p className="font-medium">{option.label}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {option.description}
                  </p>
                </button>
              ))}
            </div>
          ) : null}

          {step === 2 ? (
            <label className="block space-y-2 text-sm">
              <span className="font-medium">Your offer</span>
              <textarea
                value={offerText}
                onChange={(event) => setOfferText(event.target.value)}
                rows={4}
                className="w-full rounded-md border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                placeholder="Free AC tune-up for new customers in the Dallas area this month."
              />
              <span className="text-slate-500">
                Keep it simple — this becomes your headline and auto-replies.
              </span>
            </label>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <label className="block space-y-2 text-sm">
                <span className="font-medium">Logo URL (optional)</span>
                <input
                  value={logoUrl}
                  onChange={(event) => setLogoUrl(event.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                  placeholder="https://..."
                />
              </label>
              <label className="block space-y-2 text-sm">
                <span className="font-medium">Photo URLs (optional)</span>
                <textarea
                  value={photoUrls}
                  onChange={(event) => setPhotoUrls(event.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                  placeholder={"https://...\nhttps://..."}
                />
              </label>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-900">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt=""
                    className="mx-auto mb-4 h-16 w-16 rounded-full object-cover"
                  />
                ) : null}
                <h2 className="text-2xl font-semibold">{preview.headline}</h2>
                <p className="mt-2 text-slate-600 dark:text-slate-300">
                  {preview.subhead}
                </p>
                <div className="mt-6 inline-flex rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white">
                  {preview.cta}
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Your shareable link:{" "}
                <span className="font-mono text-emerald-700 dark:text-emerald-400">
                  {leadPageUrl}
                </span>
              </p>
              <p className="text-sm text-slate-500">
                We&apos;ll also turn on comment and DM auto-replies using your
                offer.
              </p>
            </div>
          ) : null}

          {state.error ? (
            <p className="mt-4 text-sm text-red-600">{state.error}</p>
          ) : null}
          {state.fieldErrors ? (
            <ul className="mt-4 space-y-1 text-sm text-red-600">
              {Object.entries(state.fieldErrors).flatMap(([field, messages]) =>
                (messages ?? []).map((message) => (
                  <li key={`${field}-${message}`}>
                    {field}: {message}
                  </li>
                )),
              )}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          disabled={step === 0 || pending}
          onClick={() => setStep((current) => Math.max(0, current - 1))}
        >
          Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button
            type="button"
            disabled={!canContinue() || pending}
            onClick={() => setStep((current) => current + 1)}
          >
            Continue
          </Button>
        ) : (
          <form action={formAction}>
            <input type="hidden" name="businessName" value={businessName} />
            <input type="hidden" name="businessType" value={businessType} />
            <input type="hidden" name="goal" value={goal} />
            <input type="hidden" name="offerText" value={offerText} />
            <input type="hidden" name="logoUrl" value={logoUrl} />
            <input type="hidden" name="photoUrls" value={photoUrls} />
            <Button type="submit" disabled={pending}>
              {pending ? "Launching..." : "Launch my lead page"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

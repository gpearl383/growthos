-- Optional business website URL captured during onboarding. Surfaced as a
-- link on the public lead page and as context for the AI copilot + post
-- generator so they can speak naturally about the user's site.

ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "website_url" text;

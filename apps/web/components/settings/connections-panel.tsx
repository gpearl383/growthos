import Link from "next/link";
import { Button } from "@growthos/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@growthos/ui/card";

import { disconnectPlatform } from "@/app/actions/social-accounts";
import { metaConfigured, tiktokConfigured } from "@/lib/env";
import { platformLabel, type SocialPlatform } from "@/lib/platforms";
import {
  formatConnectionStatus,
  type SocialAccountRecord,
} from "@/lib/social-accounts";

type ConnectionsPanelProps = {
  accounts: SocialAccountRecord[];
  connected?: string;
  error?: string;
};

function ConnectionCard({
  platform,
  label,
  description,
  account,
  connectHref,
  configured,
  missingConfigMessage,
}: {
  platform: SocialPlatform;
  label: string;
  description: string;
  account?: SocialAccountRecord;
  connectHref: string;
  configured: boolean;
  missingConfigMessage: string;
}) {
  const connected = account?.status === "connected";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{label}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              connected
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            {account ? formatConnectionStatus(account.status) : "Not connected"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {!connected ? (
          configured ? (
            <Link
              href={connectHref}
              className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Connect {platformLabel(platform)}
            </Link>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {missingConfigMessage}
            </p>
          )
        ) : (
          <>
            <p className="w-full text-xs text-slate-500">
              Account ID: {account.platformUserId}
            </p>
            <form action={disconnectPlatform}>
              <input type="hidden" name="platform" value={platform} />
              <Button type="submit" variant="outline" size="sm">
                Disconnect
              </Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function ConnectionsPanel({
  accounts,
  connected,
  error,
}: ConnectionsPanelProps) {
  const instagram = accounts.find((account) => account.platform === "instagram");
  const facebook = accounts.find((account) => account.platform === "facebook");
  const tiktok = accounts.find((account) => account.platform === "tiktok");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Connections</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Connect Instagram, Facebook, and TikTok to publish posts and capture
          leads from your content.
        </p>
      </div>

      {connected === "1" ? (
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20">
          <CardContent className="p-4 text-sm text-emerald-800 dark:text-emerald-300">
            Meta accounts connected. Auto-replies and publishing are ready to
            use.
          </CardContent>
        </Card>
      ) : null}

      {connected === "tiktok" ? (
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20">
          <CardContent className="p-4 text-sm text-emerald-800 dark:text-emerald-300">
            TikTok connected. You can generate TikTok posts and schedule video
            publishing from Create.
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20">
          <CardContent className="p-4 text-sm text-red-800 dark:text-red-300">
            {error}
          </CardContent>
        </Card>
      ) : null}

      <ConnectionCard
        platform="instagram"
        label="Instagram"
        description="Publish posts and reply to comments and DMs automatically."
        account={instagram}
        connectHref="/api/meta/oauth/start"
        configured={metaConfigured}
        missingConfigMessage="Add META_APP_ID and META_APP_SECRET to connect accounts."
      />

      <ConnectionCard
        platform="facebook"
        label="Facebook"
        description="Cross-post to your Facebook Page from the same Meta login."
        account={facebook}
        connectHref="/api/meta/oauth/start"
        configured={metaConfigured}
        missingConfigMessage="Add META_APP_ID and META_APP_SECRET to connect accounts."
      />

      <ConnectionCard
        platform="tiktok"
        label="TikTok"
        description="Generate TikTok captions and publish videos. Comment auto-replies are not available on TikTok yet."
        account={tiktok}
        connectHref="/api/tiktok/oauth/start"
        configured={tiktokConfigured}
        missingConfigMessage="Add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET to connect TikTok."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Setup checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <div className="space-y-2">
            <p className="font-medium text-slate-900 dark:text-slate-100">Meta</p>
            <p>1. Create a Meta developer app and add Instagram + Facebook products.</p>
            <p>2. Set OAuth redirect URI to your app callback URL.</p>
            <p>3. Subscribe webhooks for comments and messages.</p>
            <p className="font-mono text-xs">
              {process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}
              /api/meta/oauth/callback
            </p>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-slate-900 dark:text-slate-100">TikTok</p>
            <p>1. Create a TikTok developer app and enable Login Kit + Content Posting API.</p>
            <p>2. Add the redirect URI below in TikTok app settings.</p>
            <p className="font-mono text-xs">
              {process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}
              /api/tiktok/oauth/callback
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

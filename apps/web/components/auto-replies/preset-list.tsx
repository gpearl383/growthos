import { Button } from "@growthos/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@growthos/ui/card";

import { toggleAutoReplyPreset } from "@/app/actions/auto-replies";
import {
  formatPresetDescription,
  formatPresetTitle,
  renderPresetMessage,
  type AutoReplyPresetRecord,
} from "@/lib/auto-replies";

type AutoReplyPresetListProps = {
  presets: AutoReplyPresetRecord[];
  leadPageUrl: string | null;
  businessName?: string | null;
};

export function AutoReplyPresetList({
  presets,
  leadPageUrl,
  businessName,
}: AutoReplyPresetListProps) {
  if (presets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No auto-replies yet</CardTitle>
          <CardDescription>
            Complete Get Started to seed your preset replies.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Auto-Replies</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Turn on plain-English presets — no flow builder required.
        </p>
      </div>

      <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
        <CardContent className="p-4 text-sm text-amber-900 dark:text-amber-200">
          Connect Instagram and Facebook in Settings to send these automatically.
          Presets are ready now and will go live once your accounts are connected.
        </CardContent>
      </Card>

      <ul className="space-y-3">
        {presets.map((preset) => {
          const preview = renderPresetMessage(preset.messageTemplate, {
            businessName,
            link: leadPageUrl,
          });

          return (
            <li key={preset.id}>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">
                        {formatPresetTitle(preset.presetKey)}
                      </CardTitle>
                      <CardDescription>
                        {formatPresetDescription(preset.presetKey)}
                      </CardDescription>
                    </div>

                    <form action={toggleAutoReplyPreset}>
                      <input type="hidden" name="presetId" value={preset.id} />
                      <input
                        type="hidden"
                        name="enabled"
                        value={preset.enabled ? "false" : "true"}
                      />
                      <Button
                        type="submit"
                        variant={preset.enabled ? "default" : "outline"}
                        size="sm"
                      >
                        {preset.enabled ? "On" : "Off"}
                      </Button>
                    </form>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(preset.keywords ?? []).length > 0 ? (
                    <p className="text-xs text-slate-500">
                      Keywords: {(preset.keywords ?? []).join(", ")}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Trigger: every new DM
                    </p>
                  )}

                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Preview
                    </p>
                    <p>{preview}</p>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

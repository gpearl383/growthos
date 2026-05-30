import Link from "next/link";
import { Button } from "@growthos/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@growthos/ui/card";

export default function HomePage() {
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
        <div className="flex flex-wrap gap-3">
          <Link href="/get-started">
            <Button size="lg">Get started</Button>
          </Link>
          <Link href="/leads">
            <Button variant="outline" size="lg">
              View leads inbox
            </Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Get Started wizard",
            description: "Tell us your business and goal — we set up your first lead page.",
          },
          {
            title: "Create & post",
            description: "AI writes captions and hooks. Schedule or copy-to-post for Instagram, Facebook, and TikTok.",
          },
          {
            title: "Leads inbox",
            description: "Every form fill, DM, and booking lands in one plain-English inbox.",
          },
        ].map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle className="text-lg">{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                MVP scaffold
              </span>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}

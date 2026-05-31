"use client";
import { useEffect } from "react";
import { Button } from "@growthos/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-slate-500">An unexpected error occurred. Try again or refresh the page.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}

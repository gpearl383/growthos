import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

import { clerkConfigured } from "@/lib/env";

export default function SignUpPage() {
  if (!clerkConfigured) {
    return (
      <div className="mx-auto max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Sign up</h1>
        <p className="text-slate-600">
          Add Clerk keys to <code>apps/web/.env.local</code> to enable auth.
        </p>
        <Link href="/" className="text-emerald-600 hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex justify-center py-12">
      <SignUp />
    </div>
  );
}

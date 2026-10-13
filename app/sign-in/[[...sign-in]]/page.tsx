"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  if (!hasClerk) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 pt-28">
        <h1 className="font-serif text-3xl text-white">Sign in</h1>
        <p className="mt-4 text-sm text-zinc-400">
          Add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY to .env, then restart the server.
          Create a free app at clerk.com.
        </p>
        <p className="mt-3 text-sm text-zinc-500">
          Put your admin email in ADMIN_EMAILS to open Production Office at /admin.
        </p>
      </div>
    );
  }
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 pt-24">
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </div>
  );
}

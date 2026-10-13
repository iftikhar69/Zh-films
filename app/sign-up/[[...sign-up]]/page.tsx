"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  if (!hasClerk) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 pt-28">
        <h1 className="font-serif text-3xl text-white">Create account</h1>
        <p className="mt-4 text-sm text-zinc-400">Configure Clerk keys in .env to enable sign-up.</p>
      </div>
    );
  }
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 pt-24">
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </div>
  );
}

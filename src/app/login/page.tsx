import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the store administration area.",
  robots: { index: false, follow: false },
};

/** Reads the session cookie, so it is dynamic by definition. */
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/admin";

  // Already signed in? Don't show a login form, go where the user was headed.
  if (await getSession()) {
    redirect(next);
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 py-10">
      <header className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          The admin area is protected on the server. There is nothing to see here without a valid
          session cookie.
        </p>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <LoginForm next={next} />
      </div>

      <p className="rounded-md bg-slate-100 px-3 py-2 text-center text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-400">
        Demo credentials: <span className="font-mono">admin@example.com</span> /{" "}
        <span className="font-mono">admin123</span>
      </p>
    </div>
  );
}

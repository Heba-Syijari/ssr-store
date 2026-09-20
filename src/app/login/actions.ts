"use server";

import { redirect } from "next/navigation";

import { clearSessionCookie, createSessionCookie, isValidCredentials } from "@/lib/auth";

export interface LoginState {
  error?: string;
}

/**
 * Only same-origin, absolute paths are accepted as a redirect target.
 * Without this check `?next=https://evil.example` would turn the login form
 * into an open redirect.
 */
function safeRedirectTarget(value: string): string {
  if (value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  return "/admin";
}

export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeRedirectTarget(String(formData.get("next") ?? "/admin"));

  if (!email || !password) {
    return { error: "Email and password are both required." };
  }

  if (!isValidCredentials(email, password)) {
    // Deliberately vague: never reveal which half of the pair was wrong.
    return { error: "Those credentials are not valid." };
  }

  await createSessionCookie(email);

  // `redirect()` throws a special control-flow error, so it must stay outside
  // any try/catch above it.
  redirect(next);
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();

  redirect("/login");
}

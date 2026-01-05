"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  authSchema,
  emailSchema,
  resetPasswordSchema,
  signUpSchema,
} from "@/lib/validation";
import { getBaseUrl } from "@/lib/email";

function redirectWithMessage(path: string, key: string, message: string): never {
  const params = new URLSearchParams({ [key]: message });
  redirect(`${path}?${params.toString()}`);
}

function getRequestOrigin() {
  const siteUrl = getBaseUrl();
  if (siteUrl && !siteUrl.includes("localhost")) {
    return siteUrl;
  }
  return null;
}

function resolveOrigin(headerStore: Headers) {
  const forwardedHost =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";
  const forwardedProto = headerStore.get("x-forwarded-proto") ?? "https";
  const headerOrigin = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : "";
  return getRequestOrigin() ?? (headerOrigin || getBaseUrl());
}

export async function signIn(formData: FormData) {
  const parsed = authSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    redirectWithMessage("/app/sign-in", "error", parsed.error.errors[0]?.message ?? "Invalid credentials.");
  }

  const supabase = await createSupabaseServerClient({ allowWrites: true });
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    redirectWithMessage("/app/sign-in", "error", error.message);
  }

  redirect("/app");
}

export async function signUp(formData: FormData) {
  const parsed = signUpSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  if (!parsed.success) {
    redirectWithMessage("/app/sign-up", "error", parsed.error.errors[0]?.message ?? "Invalid credentials.");
  }

  const supabase = await createSupabaseServerClient({ allowWrites: true });
  const headerStore = await headers();
  const origin = resolveOrigin(headerStore);
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: origin ? `${origin}/app` : undefined,
    },
  });

  if (error) {
    redirectWithMessage("/app/sign-up", "error", error.message);
  }

  redirectWithMessage(
    "/app/sign-in",
    "message",
    "Check your email to confirm your account."
  );
}

export async function signInWithGoogle() {
  const supabase = await createSupabaseServerClient({ allowWrites: true });
  const headerStore = await headers();
  const origin = resolveOrigin(headerStore);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/app/auth/callback`,
    },
  });

  if (error || !data?.url) {
    redirectWithMessage(
      "/app/sign-in",
      "error",
      error?.message ?? "Failed to start Google sign-in."
    );
  }

  redirect(data.url);
}

export async function sendPasswordReset(formData: FormData) {
  const parsed = emailSchema.safeParse({
    email: String(formData.get("email") ?? ""),
  });

  if (!parsed.success) {
    redirectWithMessage(
      "/app/forgot-password",
      "error",
      parsed.error.errors[0]?.message ?? "Enter a valid email."
    );
  }

  const supabase = await createSupabaseServerClient({ allowWrites: true });
  const headerStore = await headers();
  const origin = resolveOrigin(headerStore);
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/app/auth/callback?type=recovery`,
  });

  if (error) {
    redirectWithMessage("/app/forgot-password", "error", error.message);
  }

  redirectWithMessage(
    "/app/forgot-password",
    "message",
    "Check your email for a password reset link."
  );
}

export async function updatePassword(formData: FormData) {
  const parsed = resetPasswordSchema.safeParse({
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  if (!parsed.success) {
    redirectWithMessage(
      "/app/reset-password",
      "error",
      parsed.error.errors[0]?.message ?? "Invalid password."
    );
  }

  const supabase = await createSupabaseServerClient({ allowWrites: true });
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    redirectWithMessage("/app/reset-password", "error", error.message);
  }

  await supabase.auth.signOut();

  redirectWithMessage(
    "/app/sign-in",
    "message",
    "Password updated. Sign in with your new password."
  );
}

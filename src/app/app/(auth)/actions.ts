"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { authSchema } from "@/lib/validation";
import { getBaseUrl } from "@/lib/email";

function redirectWithMessage(path: string, key: string, message: string): never {
  const params = new URLSearchParams({ [key]: message });
  redirect(`${path}?${params.toString()}`);
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
  const parsed = authSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    redirectWithMessage("/app/sign-up", "error", parsed.error.errors[0]?.message ?? "Invalid credentials.");
  }

  const supabase = await createSupabaseServerClient({ allowWrites: true });
  const origin = (await headers()).get("origin") ?? "";
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
  const forwardedHost =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";
  const forwardedProto = headerStore.get("x-forwarded-proto") ?? "https";
  const origin =
    forwardedHost ? `${forwardedProto}://${forwardedHost}` : getBaseUrl();
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

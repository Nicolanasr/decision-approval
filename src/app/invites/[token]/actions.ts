"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function redirectWithError(token: string, message: string) {
  const params = new URLSearchParams({ error: message });
  redirect(`/invites/${token}?${params.toString()}`);
}

export async function acceptInvite(formData: FormData) {
  const token = String(formData.get("token") ?? "");

  if (!token) {
    redirect("/");
  }

  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect(`/sign-in?message=${encodeURIComponent("Sign in to accept invite.")}`);
  }

  const { data: workspaceId, error } = await supabase.rpc(
    "accept_workspace_invite",
    { invite_token: token }
  );

  if (error || !workspaceId) {
    redirectWithError(token, error?.message ?? "Unable to accept invite.");
  }

  redirect("/");
}

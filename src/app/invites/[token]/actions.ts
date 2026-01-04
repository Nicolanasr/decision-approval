"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { acceptInviteSchema } from "@/lib/validation";

function redirectWithError(token: string, message: string): never {
  const params = new URLSearchParams({ error: message });
  redirect(`/invites/${token}?${params.toString()}`);
}

export async function acceptInvite(formData: FormData) {
  const parsed = acceptInviteSchema.safeParse({
    token: String(formData.get("token") ?? ""),
    name: String(formData.get("name") ?? ""),
    title: String(formData.get("title") ?? ""),
  });

  if (!parsed.success) {
    redirect("/");
  }
  const { token, name, title } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect(`/sign-in?message=${encodeURIComponent("Sign in to accept invite.")}`);
  }

  const { data: workspaceId, error } = await supabase.rpc(
    "accept_workspace_invite",
    { invite_token: token, target_name: name ?? null, target_title: title ?? null }
  );

  if (error || !workspaceId) {
    redirectWithError(token, error?.message ?? "Unable to accept invite.");
  }

  redirect("/");
}

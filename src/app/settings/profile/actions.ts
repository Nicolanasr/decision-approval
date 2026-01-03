"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspaces";

function redirectWithError(message: string) {
  const params = new URLSearchParams({ error: message });
  redirect(`/settings/profile?${params.toString()}`);
}

export async function updateProfile(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();

  if (!name || !title) {
    redirectWithError("Name and title are required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/sign-in");
  }

  const { workspace: activeWorkspace } = await getActiveWorkspace(
    supabase,
    authData.user.id
  );

  if (!activeWorkspace) {
    redirect("/onboarding");
  }

  const { error } = await supabase
    .from("workspace_members")
    .update({
      member_name: name,
      member_title: title,
    })
    .eq("workspace_id", activeWorkspace.id)
    .eq("user_id", authData.user.id);

  if (error) {
    redirectWithError(error.message);
  }

  redirect("/");
}

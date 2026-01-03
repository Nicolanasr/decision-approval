"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function redirectWithError(message: string) {
  const params = new URLSearchParams({ error: message });
  redirect(`/onboarding?${params.toString()}`);
}

export async function createWorkspace(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) {
    redirectWithError("Workspace name is required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/sign-in");
  }

  const { data: workspaceId, error: workspaceError } = await supabase.rpc(
    "create_workspace_with_admin",
    { workspace_name: name, workspace_description: description || null }
  );

  if (workspaceError || !workspaceId) {
    redirectWithError(workspaceError?.message ?? "Unable to create workspace.");
  }

  redirect("/");
}

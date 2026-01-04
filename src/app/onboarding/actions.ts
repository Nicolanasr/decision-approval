"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { workspaceSchema } from "@/lib/validation";

function redirectWithError(message: string): never {
  const params = new URLSearchParams({ error: message });
  redirect(`/onboarding?${params.toString()}`);
}

export async function createWorkspace(formData: FormData) {
  const parsed = workspaceSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
  });

  if (!parsed.success) {
    redirectWithError(parsed.error.errors[0]?.message ?? "Workspace name is required.");
  }
  const description = parsed.data.description ?? null;

  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/sign-in");
  }

  const { data: workspaceId, error: workspaceError } = await supabase.rpc(
    "create_workspace_with_admin",
    { workspace_name: parsed.data.name, workspace_description: description }
  );

  if (workspaceError || !workspaceId) {
    redirectWithError(workspaceError?.message ?? "Unable to create workspace.");
  }

  redirect("/");
}

"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function redirectWithError(message: string) {
  const params = new URLSearchParams({ error: message });
  redirect(`/settings/workspaces?${params.toString()}`);
}

export async function switchWorkspace(formData: FormData) {
  const workspaceId = String(formData.get("workspaceId") ?? "");

  if (!workspaceId) {
    redirectWithError("Workspace is required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/sign-in");
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", authData.user.id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!membership) {
    redirectWithError("You do not have access to that workspace.");
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: "workspace_id",
    value: workspaceId,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });

  redirect("/");
}

export async function createWorkspace(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    redirectWithError("Workspace name is required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/sign-in");
  }

  const { data: workspaceId, error } = await supabase.rpc(
    "create_workspace_with_admin",
    { workspace_name: name }
  );

  if (error || !workspaceId) {
    redirectWithError(error?.message ?? "Unable to create workspace.");
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: "workspace_id",
    value: workspaceId,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });

  redirect("/");
}

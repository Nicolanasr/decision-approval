"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { switchWorkspaceSchema, workspaceSchema } from "@/lib/validation";

function redirectWithError(message: string): never {
  const params = new URLSearchParams({ error: message });
  redirect(`/app/settings/workspaces?${params.toString()}`);
}

export async function switchWorkspace(formData: FormData) {
  const parsed = switchWorkspaceSchema.safeParse({
    workspaceId: String(formData.get("workspaceId") ?? ""),
  });

  if (!parsed.success) {
    redirectWithError(parsed.error.errors[0]?.message ?? "Workspace is required.");
  }
  const workspaceId = parsed.data.workspaceId;

  const supabase = await createSupabaseServerClient({ allowWrites: true });
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/app/sign-in");
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

  redirect("/app");
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

  const supabase = await createSupabaseServerClient({ allowWrites: true });
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/app/sign-in");
  }

  const { data: workspaceId, error } = await supabase.rpc(
    "create_workspace_with_admin",
    { workspace_name: parsed.data.name, workspace_description: description }
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

  redirect("/app");
}

export async function setDefaultWorkspace(formData: FormData) {
  const parsed = switchWorkspaceSchema.safeParse({
    workspaceId: String(formData.get("workspaceId") ?? ""),
  });

  if (!parsed.success) {
    redirectWithError(parsed.error.errors[0]?.message ?? "Workspace is required.");
  }

  const supabase = await createSupabaseServerClient({ allowWrites: true });
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/app/sign-in");
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", authData.user.id)
    .eq("workspace_id", parsed.data.workspaceId)
    .maybeSingle();

  if (!membership) {
    redirectWithError("You do not have access to that workspace.");
  }

  const { error: setError } = await supabase.rpc("set_default_workspace", {
    target_workspace_id: parsed.data.workspaceId,
  });

  if (setError) {
    redirectWithError(setError.message);
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: "workspace_id",
    value: parsed.data.workspaceId,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });

  redirect("/app/settings/workspaces");
}

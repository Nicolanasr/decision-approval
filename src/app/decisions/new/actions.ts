"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspaces";

function redirectWithMessage(message: string) {
  const params = new URLSearchParams({ error: message });
  redirect(`/decisions/new?${params.toString()}`);
}

export async function createDecision(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const context = String(formData.get("context") ?? "").trim();
  const approverIds = formData
    .getAll("approvers")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (!title || !summary || !context) {
    redirectWithMessage("Title, summary, and context are required.");
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

  const { data: currentMembership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", activeWorkspace.id)
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (currentMembership?.role === "auditor") {
    redirectWithMessage("Auditors cannot create decisions.");
  }

  if (currentMembership?.role === "approver") {
    redirectWithMessage("Approvers cannot create decisions.");
  }

  const { data: decision, error } = await supabase
    .from("decisions")
    .insert({
      workspace_id: activeWorkspace.id,
      title,
      summary,
      context,
      owner_user_id: authData.user.id,
    })
    .select("id")
    .single();

  if (error || !decision) {
    redirectWithMessage(error?.message ?? "Unable to create decision.");
  }

  if (approverIds.length > 0) {
    const approverRows = approverIds.map((approver_user_id) => ({
      decision_id: decision.id,
      approver_user_id,
    }));
    const { error: approverError } = await supabase
      .from("decision_approvers")
      .insert(approverRows);

    if (approverError) {
      redirectWithMessage(approverError.message);
    }
  }

  const { error: eventError } = await supabase
    .from("decision_events")
    .insert({
      decision_id: decision.id,
      type: "created",
      actor_user_id: authData.user.id,
      metadata_json: {},
    });

  if (eventError) {
    redirectWithMessage(eventError.message);
  }

  redirect(`/decisions/${decision.id}`);
}

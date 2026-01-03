"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspaces";

function redirectWithError(message: string) {
  const params = new URLSearchParams({ error: message });
  redirect(`/settings/members?${params.toString()}`);
}

export async function addWorkspaceMember(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const role = String(formData.get("role") ?? "member").trim();

  if (!email) {
    redirectWithError("Email is required.");
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

  if (currentMembership?.role !== "admin") {
    redirectWithError("Only admins can manage members.");
  }

  const { error } = await supabase.rpc("add_workspace_member_by_email", {
    target_workspace_id: activeWorkspace.id,
    target_email: email,
    target_name: name || null,
  });

  if (error) {
    redirectWithError(error.message);
  }

  if (title || role) {
    const updates: { member_title?: string | null; role?: string } = {};
    if (title) {
      updates.member_title = title;
    }
    if (role) {
      updates.role = role;
    }

    const { error: updateError } = await supabase
      .from("workspace_members")
      .update(updates)
      .eq("workspace_id", activeWorkspace.id)
      .ilike("member_email", email);

    if (updateError) {
      redirectWithError(updateError.message);
    }
  }

  redirect("/settings/members");
}

export async function createInvite(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const role = String(formData.get("role") ?? "member").trim();

  if (!email) {
    redirectWithError("Invite email is required.");
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

  if (currentMembership?.role !== "admin") {
    redirectWithError("Only admins can manage members.");
  }

  const { data: token, error } = await supabase.rpc("create_workspace_invite", {
    target_workspace_id: activeWorkspace.id,
    target_email: email,
    target_role: role || "member",
  });

  if (error || !token) {
    redirectWithError(error?.message ?? "Unable to create invite.");
  }

  const params = new URLSearchParams({ invite: token, title, role });
  redirect(`/settings/members?${params.toString()}`);
}

export async function updateMember(formData: FormData) {
  const memberId = String(formData.get("memberId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();

  if (!memberId) {
    redirect("/settings/members");
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

  if (currentMembership?.role !== "admin") {
    redirectWithError("Only admins can manage members.");
  }

  const updates: {
    member_name?: string | null;
    member_title?: string | null;
    role?: string;
  } = {};

  updates.member_name = name || null;
  updates.member_title = title || null;

  if (role) {
    updates.role = role;
  }

  const { error } = await supabase
    .from("workspace_members")
    .update(updates)
    .eq("id", memberId)
    .eq("workspace_id", activeWorkspace.id);

  if (error) {
    redirectWithError(error.message);
  }

  redirect("/settings/members");
}

export async function removeMember(formData: FormData) {
  const memberId = String(formData.get("memberId") ?? "");
  const confirmText = String(formData.get("confirmText") ?? "").trim();
  const confirmChecked = String(formData.get("confirmChecked") ?? "") === "on";

  if (!memberId) {
    redirect("/settings/members");
  }

  if (confirmText.toUpperCase() !== "REMOVE" || !confirmChecked) {
    redirectWithError("Please confirm removal by typing REMOVE and checking the box.");
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

  if (currentMembership?.role !== "admin") {
    redirectWithError("Only admins can manage members.");
  }

  const { data: targetMember } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("id", memberId)
    .eq("workspace_id", activeWorkspace.id)
    .maybeSingle();

  if (!targetMember) {
    redirectWithError("Member not found in this workspace.");
  }

  if (targetMember.user_id === authData.user.id) {
    redirectWithError("You cannot remove yourself. Use another admin.");
  }

  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("id", memberId)
    .eq("workspace_id", activeWorkspace.id);

  if (error) {
    redirectWithError(error.message);
  }

  redirect("/settings/members");
}

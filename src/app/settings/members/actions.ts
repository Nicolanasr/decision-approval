"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspaces";
import { getBaseUrl, sendEmail } from "@/lib/email";

function redirectWithError(message: string): never {
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
    target_title: title || null,
    target_role: role || "member",
  });

  if (error) {
    redirectWithError(error.message);
  }

  redirect("/settings/members");
}

export async function createInvite(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const role = String(formData.get("role") ?? "member").trim();
  const name = String(formData.get("name") ?? "").trim();

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

  const { data: inviter } = await supabase
    .from("workspace_members")
    .select("member_name,member_email")
    .eq("workspace_id", activeWorkspace.id)
    .eq("user_id", authData.user.id)
    .maybeSingle();
  const inviterLabel =
    inviter?.member_name ||
    inviter?.member_email ||
    authData.user.email ||
    "A workspace admin";

  const { data: token, error } = await supabase.rpc("create_workspace_invite", {
    target_workspace_id: activeWorkspace.id,
    target_email: email,
    target_role: role || "member",
  });

  if (error || !token) {
    redirectWithError(error?.message ?? "Unable to create invite.");
  }

  const inviteParams = new URLSearchParams();
  if (name) {
    inviteParams.set("name", name);
  }
  if (title) {
    inviteParams.set("title", title);
  }
  const inviteLink = `${getBaseUrl()}/invites/${token}${
    inviteParams.toString() ? `?${inviteParams.toString()}` : ""
  }`;

  await sendEmail({
    to: email,
    subject: `You're invited to ${activeWorkspace.name}`,
    html: `
      <p>${inviterLabel} invited you to join a workspace.</p>
      <p><strong>${activeWorkspace.name}</strong></p>
      <p><a href="${inviteLink}">Accept invite</a></p>
      ${name ? `<p>Suggested name: ${name}</p>` : ""}
      ${title ? `<p>Suggested title: ${title}</p>` : ""}
    `,
    text: `${inviterLabel} invited you to join ${activeWorkspace.name}.\n${name ? `Suggested name: ${name}\n` : ""}${title ? `Suggested title: ${title}\n` : ""}Accept invite: ${inviteLink}`,
  });

  const params = new URLSearchParams({ invite: token, title, role, name });
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

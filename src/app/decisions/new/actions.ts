"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspaces";
import { getBaseUrl, sendEmail } from "@/lib/email";

function redirectWithMessage(message: string) {
  const params = new URLSearchParams({ error: message });
  redirect(`/decisions/new?${params.toString()}`);
}

export async function createDecision(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const context = String(formData.get("context") ?? "").trim();
  const linksRaw = String(formData.get("links") ?? "").trim();
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

  if (linksRaw) {
    const links = linksRaw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        let label = "";
        let url = "";
        if (line.includes("|")) {
          const [left, right] = line.split("|").map((part) => part.trim());
          label = left ?? "";
          url = right ?? "";
        } else if (line.includes(" - ")) {
          const [left, right] = line.split(" - ").map((part) => part.trim());
          label = left ?? "";
          url = right ?? "";
        } else if (line.startsWith("http")) {
          url = line;
        } else if (line.includes("http")) {
          const httpIndex = line.indexOf("http");
          label = line.slice(0, httpIndex).trim();
          url = line.slice(httpIndex).trim();
        }
        if (!url || !url.startsWith("http")) {
          return null;
        }
        return {
          decision_id: decision.id,
          label: label || url,
          url,
        };
      })
      .filter(Boolean) as { decision_id: string; label: string; url: string }[];

    if (links.length > 0) {
      const { error: linksError } = await supabase
        .from("decision_links")
        .insert(links);

      if (linksError) {
        redirectWithMessage(linksError.message);
      }
    }
  }

  if (approverIds.length > 0) {
    const { data: approverMembers } = await supabase
      .from("workspace_members")
      .select("member_email,member_name")
      .eq("workspace_id", activeWorkspace.id)
      .in("user_id", approverIds);

    const decisionLink = `${getBaseUrl()}/decisions/${decision.id}`;
    const recipients =
      approverMembers?.map((member) => member.member_email).filter(Boolean) ??
      [];

    await Promise.all(
      recipients.map((email) =>
        sendEmail({
          to: String(email),
          subject: `Approval requested: ${title}`,
          html: `
            <p>A decision needs your approval.</p>
            <p><strong>${title}</strong></p>
            <p><a href="${decisionLink}">Review decision</a></p>
          `,
          text: `Approval requested: ${title}\n${decisionLink}`,
        })
      )
    );
  }

  redirect(`/decisions/${decision.id}`);
}

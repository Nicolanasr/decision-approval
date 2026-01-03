"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getBaseUrl, sendEmail } from "@/lib/email";

function redirectWithError(decisionId: string, message: string) {
  const params = new URLSearchParams({ error: message });
  redirect(`/decisions/${decisionId}/edit?${params.toString()}`);
}

export async function updateDecision(formData: FormData) {
  const decisionId = String(formData.get("decisionId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const context = String(formData.get("context") ?? "").trim();
  const approverIds = formData
    .getAll("approvers")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (!decisionId) {
    redirect("/");
  }

  if (!title || !summary || !context) {
    redirectWithError(decisionId, "Title, summary, and context are required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/sign-in");
  }

  const { data: decision } = await supabase
    .from("decisions")
    .select("id,owner_user_id,workspace_id,status,title,summary,context")
    .eq("id", decisionId)
    .single();

  if (!decision) {
    redirectWithError(decisionId, "Decision not found.");
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", decision.workspace_id)
    .eq("user_id", authData.user.id)
    .maybeSingle();

  const isOwner = decision.owner_user_id === authData.user.id;
  const isAdmin = membership?.role === "admin";

  if (!isOwner && !isAdmin) {
    redirectWithError(decisionId, "You do not have permission to edit.");
  }

  if (decision.status !== "pending") {
    redirectWithError(decisionId, "Only pending decisions can be edited.");
  }

  const { data: existingApprovers } = await supabase
    .from("decision_approvers")
    .select("approver_user_id")
    .eq("decision_id", decisionId);

  const existingIds = new Set(
    existingApprovers?.map((row) => row.approver_user_id) ?? []
  );
  const nextIds = new Set(approverIds);

  const toAdd = approverIds.filter((id) => !existingIds.has(id));
  const toRemove = [...existingIds].filter((id) => !nextIds.has(id));

  if (toRemove.length > 0) {
    const { error: removeError } = await supabase
      .from("decision_approvers")
      .delete()
      .eq("decision_id", decisionId)
      .in("approver_user_id", toRemove);

    if (removeError) {
      redirectWithError(decisionId, removeError.message);
    }
  }

  if (toAdd.length > 0) {
    const { error: addError } = await supabase
      .from("decision_approvers")
      .insert(
        toAdd.map((approver_user_id) => ({
          decision_id: decisionId,
          approver_user_id,
        }))
      );

    if (addError) {
      redirectWithError(decisionId, addError.message);
    }
  }

  const updates = {
    title,
    summary,
    context,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("decisions")
    .update(updates)
    .eq("id", decisionId);

  if (error) {
    redirectWithError(decisionId, error.message);
  }

  const changes: Record<
    string,
    { from: string | null; to: string | null }
  > = {};
  if (decision.title !== title) {
    changes.title = { from: decision.title, to: title };
  }
  if (decision.summary !== summary) {
    changes.summary = { from: decision.summary, to: summary };
  }
  if (decision.context !== context) {
    changes.context = { from: decision.context, to: context };
  }

  const events = [];
  if (Object.keys(changes).length > 0) {
    events.push({
      decision_id: decisionId,
      type: "edited",
      actor_user_id: authData.user.id,
      metadata_json: { changes },
    });
  }

  if (toAdd.length > 0 || toRemove.length > 0) {
    events.push({
      decision_id: decisionId,
      type: "approvers_updated",
      actor_user_id: authData.user.id,
      metadata_json: { added: toAdd, removed: toRemove },
    });
  }

  if (events.length > 0) {
    const { error: eventError } = await supabase
      .from("decision_events")
      .insert(events);

    if (eventError) {
      redirectWithError(decisionId, eventError.message);
    }
  }

  if (toAdd.length > 0 || toRemove.length > 0) {
    const { data: members } = await supabase
      .from("workspace_members")
      .select("user_id,member_email")
      .eq("workspace_id", decision.workspace_id);

    const decisionLink = `${getBaseUrl()}/decisions/${decisionId}`;
    const memberLookup = new Map(
      members?.map((member) => [member.user_id, member.member_email]) ?? []
    );

    const addedEmails = toAdd
      .map((id) => memberLookup.get(id))
      .filter(Boolean) as string[];
    const removedEmails = toRemove
      .map((id) => memberLookup.get(id))
      .filter(Boolean) as string[];

    await Promise.all(
      addedEmails.map((email) =>
        sendEmail({
          to: email,
          subject: `You've been added as an approver: ${decision.title}`,
          html: `
            <p>You were added as an approver.</p>
            <p><strong>${decision.title}</strong></p>
            <p><a href="${decisionLink}">View decision</a></p>
          `,
          text: `You've been added as an approver: ${decision.title}\n${decisionLink}`,
        })
      )
    );

    await Promise.all(
      removedEmails.map((email) =>
        sendEmail({
          to: email,
          subject: `You've been removed as an approver: ${decision.title}`,
          html: `
            <p>You were removed as an approver.</p>
            <p><strong>${decision.title}</strong></p>
          `,
          text: `You've been removed as an approver: ${decision.title}`,
        })
      )
    );
  }

  redirect(`/decisions/${decisionId}`);
}

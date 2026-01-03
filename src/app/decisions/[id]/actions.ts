"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getBaseUrl, sendEmail } from "@/lib/email";

function redirectWithError(decisionId: string, message: string) {
	const params = new URLSearchParams({ error: message });
	redirect(`/decisions/${decisionId}?${params.toString()}`);
}

export async function updateApproval(formData: FormData) {
	const decisionId = String(formData.get("decisionId") ?? "");
	const action = String(formData.get("action") ?? "");

	if (!decisionId || !action) {
		redirect("/");
	}

	if (action !== "approve" && action !== "reject") {
		redirectWithError(decisionId, "Invalid action.");
	}

	const supabase = await createSupabaseServerClient();
	const { data: authData } = await supabase.auth.getUser();

	if (!authData.user) {
		redirect("/sign-in");
	}

	const { data: decision, error: decisionError } = await supabase
		.from("decisions")
		.select("status,title,summary,owner_user_id,workspace_id")
		.eq("id", decisionId)
		.single();

	if (decisionError || !decision) {
		redirectWithError(decisionId, "Decision not found.");
	}

	if (decision.status !== "pending") {
		redirectWithError(decisionId, `Only pending decisions can be approved/rejected.`);
	}

	const { data: approverRow, error: approverError } = await supabase
		.from("decision_approvers")
		.update({
			status: action === "approve" ? "approved" : "rejected",
			decided_at: new Date().toISOString(),
		})
		.eq("decision_id", decisionId)
		.eq("approver_user_id", authData.user.id)
		.eq("status", "pending")
		.select("id")
		.maybeSingle();

	if (approverError) {
		redirectWithError(decisionId, approverError.message);
	}

	if (!approverRow) {
		redirectWithError(decisionId, "You are not assigned to this decision.");
	}

	const { error: eventError } = await supabase.from("decision_events").insert({
		decision_id: decisionId,
		type: action === "approve" ? "approved" : "rejected",
		actor_user_id: authData.user.id,
		metadata_json: {},
	});

	if (eventError) {
		redirectWithError(decisionId, eventError.message);
	}

	const { data: actorMember } = await supabase
		.from("workspace_members")
		.select("member_name,member_email")
		.eq("workspace_id", decision.workspace_id)
		.eq("user_id", authData.user.id)
		.maybeSingle();

	const { data: approverRows } = await supabase
		.from("decision_approvers")
		.select("approver_user_id")
		.eq("decision_id", decisionId);

	const approvalRecipients = [
		decision.owner_user_id,
		...(approverRows?.map((row) => row.approver_user_id) ?? []),
	].filter((id) => id !== authData.user.id);

	const { data: approvalRecipientMembers } =
		approvalRecipients.length > 0
			? await supabase
					.from("workspace_members")
					.select("user_id,member_email")
					.eq("workspace_id", decision.workspace_id)
					.in("user_id", approvalRecipients)
			: { data: [] };

	const decisionLink = `${getBaseUrl()}/decisions/${decisionId}`;
	const actorLabel =
		actorMember?.member_name ||
		actorMember?.member_email ||
		authData.user.email ||
		"An approver";
	const approvalSubject =
		action === "approve"
			? `Approval recorded: ${decision.title}`
			: `Rejection recorded: ${decision.title}`;

	await Promise.all(
		(approvalRecipientMembers ?? [])
			.filter((member) => member.member_email)
			.map((member) =>
				sendEmail({
					to: String(member.member_email),
					subject: approvalSubject,
					html: `
            <p>${actorLabel} ${action === "approve" ? "approved" : "rejected"} the decision.</p>
            <p><strong>${decision.title}</strong></p>
            <p>${decision.summary ?? ""}</p>
            <p><a href="${decisionLink}">View decision</a></p>
          `,
					text: `${actorLabel} ${action === "approve" ? "approved" : "rejected"} the decision: ${decision.title}\n${decision.summary ?? ""}\n${decisionLink}`,
				})
			)
	);

	const { error: statusError } = await supabase.rpc("update_decision_status_from_approvals", {
		target_decision_id: decisionId,
	});

	if (statusError) {
		redirectWithError(decisionId, statusError.message);
	}

	const { data: updatedDecision } = await supabase.from("decisions").select("status").eq("id", decisionId).single();

	if (updatedDecision?.status === "approved" || updatedDecision?.status === "rejected") {
		const { data: approverRows } = await supabase
			.from("decision_approvers")
			.select("approver_user_id")
			.eq("decision_id", decisionId);

		const recipientIds = [
			decision.owner_user_id,
			...(approverRows?.map((row) => row.approver_user_id) ?? []),
		];

		const { data: recipients } =
			recipientIds.length > 0
				? await supabase
						.from("workspace_members")
						.select("user_id,member_email")
						.eq("workspace_id", decision.workspace_id)
						.in("user_id", recipientIds)
				: { data: [] };

		const decisionLink = `${getBaseUrl()}/decisions/${decisionId}`;
		const subject =
			updatedDecision.status === "approved"
				? `Decision approved: ${decision.title}`
				: `Decision rejected: ${decision.title}`;

		await Promise.all(
			(recipients ?? [])
				.filter((member) => member.member_email)
				.map((member) =>
					sendEmail({
						to: String(member.member_email),
						subject,
						html: `
              <p>The decision status has changed to <strong>${updatedDecision.status}</strong>.</p>
              <p><strong>${decision.title}</strong></p>
              <p>${decision.summary ?? ""}</p>
              <p>Last updated by ${actorLabel}.</p>
              <p><a href="${decisionLink}">View decision</a></p>
            `,
						text: `${subject}\n${decision.summary ?? ""}\nLast updated by ${actorLabel}.\n${decisionLink}`,
					})
				)
		);
	}

	redirect(`/decisions/${decisionId}`);
}

export async function addComment(formData: FormData) {
	const decisionId = String(formData.get("decisionId") ?? "");
	const body = String(formData.get("body") ?? "").trim();

	if (!decisionId) {
		redirect("/");
	}

	if (!body) {
		redirectWithError(decisionId, "Comment cannot be empty.");
	}

	const supabase = await createSupabaseServerClient();
	const { data: authData } = await supabase.auth.getUser();

	if (!authData.user) {
		redirect("/sign-in");
	}

	const { error } = await supabase.from("decision_comments").insert({
		decision_id: decisionId,
		user_id: authData.user.id,
		body,
	});

	if (error) {
		redirectWithError(decisionId, error.message);
	}

	const { data: decision } = await supabase
		.from("decisions")
		.select("title,owner_user_id,workspace_id")
		.eq("id", decisionId)
		.single();

	if (decision) {
		const { data: commenter } = await supabase
			.from("workspace_members")
			.select("member_name,member_email")
			.eq("workspace_id", decision.workspace_id)
			.eq("user_id", authData.user.id)
			.maybeSingle();
		const commenterLabel =
			commenter?.member_name ||
			commenter?.member_email ||
			authData.user.email ||
			"A workspace member";

		const { data: approverRows } = await supabase
			.from("decision_approvers")
			.select("approver_user_id")
			.eq("decision_id", decisionId);

		const recipientIds = [
			decision.owner_user_id,
			...(approverRows?.map((row) => row.approver_user_id) ?? []),
		].filter((id) => id !== authData.user.id);

		const { data: recipients } =
			recipientIds.length > 0
				? await supabase
						.from("workspace_members")
						.select("user_id,member_email")
						.eq("workspace_id", decision.workspace_id)
						.in("user_id", recipientIds)
				: { data: [] };

		const decisionLink = `${getBaseUrl()}/decisions/${decisionId}`;
		await Promise.all(
			(recipients ?? [])
				.filter((member) => member.member_email)
				.map((member) =>
					sendEmail({
						to: String(member.member_email),
						subject: `New comment: ${decision.title}`,
						html: `
              <p>${commenterLabel} added a comment.</p>
              <p><strong>${decision.title}</strong></p>
              <p>${decision.summary ?? ""}</p>
              <p><strong>Comment</strong></p>
              <p>${body}</p>
              <p><a href="${decisionLink}">View decision</a></p>
            `,
						text: `${commenterLabel} added a comment on: ${decision.title}\n${decision.summary ?? ""}\nComment: ${body}\n${decisionLink}`,
					})
				)
		);
	}

	redirect(`/decisions/${decisionId}`);
}

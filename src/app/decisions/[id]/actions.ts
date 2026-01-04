"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getBaseUrl, sendEmail } from "@/lib/email";
import { commentSchema, decisionActionSchema } from "@/lib/validation";

function redirectWithError(decisionId: string, message: string): never {
	const params = new URLSearchParams({ error: message });
	redirect(`/decisions/${decisionId}?${params.toString()}`);
}

export async function updateApproval(formData: FormData) {
	const parsed = decisionActionSchema.safeParse({
		decisionId: String(formData.get("decisionId") ?? ""),
		action: String(formData.get("action") ?? ""),
	});

	if (!parsed.success) {
		const fallbackId = String(formData.get("decisionId") ?? "");
		if (fallbackId) {
			redirectWithError(
				fallbackId,
				parsed.error.errors[0]?.message ?? "Invalid approval action."
			);
		}
		redirect("/");
	}

	const { decisionId, action } = parsed.data;

	const supabase = await createSupabaseServerClient();
	const { data: authData } = await supabase.auth.getUser();

	console.log("[action] updateApproval auth", {
		userId: authData.user?.id ?? null,
		decisionId,
		action,
	});

	if (!authData.user) {
		redirect("/sign-in");
	}

	const { data: decision, error: decisionError } = await supabase
		.from("decisions")
		.select("status,title,summary,context,owner_user_id,workspace_id")
		.eq("id", decisionId)
		.single();

	console.log("[action] updateApproval decision", {
		decisionFound: Boolean(decision),
		status: decision?.status ?? null,
	});

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
			? `Decision – ${decision.title} - Approved`
			: `Decision – ${decision.title} - Rejected`;
	let emailError: string | null = null;

	const approvalResults = await Promise.all(
		(approvalRecipientMembers ?? [])
			.filter((member) => member.member_email)
			.map((member) =>
				sendEmail({
					to: String(member.member_email),
					subject: approvalSubject,
					html: `
            <p>${actorLabel} ${action === "approve" ? "approved" : "rejected"} the decision.</p>
            <p><strong>${decision.title}</strong></p>
            <p><strong>Summary</strong></p>
            <p>${decision.summary ?? ""}</p>
            <p><strong>Context</strong></p>
            <p>${decision.context ?? ""}</p>
            <p><a href="${decisionLink}">View decision</a></p>
          `,
					text: `${actorLabel} ${action === "approve" ? "approved" : "rejected"} the decision: ${decision.title}\nSummary: ${decision.summary ?? ""}\nContext: ${decision.context ?? ""}\n${decisionLink}`,
				})
			)
	);
	const approvalFailed = approvalResults.find((result) => !result.ok);
	if (approvalFailed) {
		emailError = approvalFailed.error ?? "Failed to send approval emails.";
	}

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
				? `Decision – ${decision.title} - Approved`
				: `Decision – ${decision.title} - Rejected`;

		const finalResults = await Promise.all(
			(recipients ?? [])
				.filter((member) => member.member_email)
				.map((member) =>
					sendEmail({
						to: String(member.member_email),
						subject,
						html: `
              <p>The decision status has changed to <strong>${updatedDecision.status}</strong>.</p>
              <p><strong>${decision.title}</strong></p>
              <p><strong>Summary</strong></p>
              <p>${decision.summary ?? ""}</p>
              <p><strong>Context</strong></p>
              <p>${decision.context ?? ""}</p>
              <p>Last updated by ${actorLabel}.</p>
              <p><a href="${decisionLink}">View decision</a></p>
            `,
						text: `${subject}\nSummary: ${decision.summary ?? ""}\nContext: ${decision.context ?? ""}\nLast updated by ${actorLabel}.\n${decisionLink}`,
					})
				)
		);
		const finalFailed = finalResults.find((result) => !result.ok);
		if (finalFailed) {
			emailError = finalFailed.error ?? "Failed to send decision status emails.";
		}
	}
	if (emailError) {
		redirectWithError(decisionId, emailError);
	}

	redirect(`/decisions/${decisionId}`);
}

export async function addComment(formData: FormData) {
	const parsed = commentSchema.safeParse({
		decisionId: String(formData.get("decisionId") ?? ""),
		body: String(formData.get("body") ?? ""),
	});

	if (!parsed.success) {
		const fallbackId = String(formData.get("decisionId") ?? "");
		if (fallbackId) {
			redirectWithError(
				fallbackId,
				parsed.error.errors[0]?.message ?? "Invalid comment."
			);
		}
		redirect("/");
	}
	const { decisionId, body } = parsed.data;

	const supabase = await createSupabaseServerClient();
	const { data: authData } = await supabase.auth.getUser();

	console.log("[action] addComment auth", {
		userId: authData.user?.id ?? null,
		decisionId,
	});

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
		.select("title,summary,context,owner_user_id,workspace_id")
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
		const commentFailed = (await Promise.all(
			(recipients ?? [])
				.filter((member) => member.member_email)
				.map((member) =>
					sendEmail({
						to: String(member.member_email),
						subject: `Decision – ${decision.title} - Comment added`,
						html: `
              <p>${commenterLabel} added a comment.</p>
              <p><strong>${decision.title}</strong></p>
              <p><strong>Summary</strong></p>
              <p>${decision.summary ?? ""}</p>
              <p><strong>Context</strong></p>
              <p>${decision.context ?? ""}</p>
              <p><strong>Comment</strong></p>
              <p>${body}</p>
              <p><a href="${decisionLink}">View decision</a></p>
            `,
						text: `${commenterLabel} added a comment on: ${decision.title}\nSummary: ${decision.summary ?? ""}\nContext: ${decision.context ?? ""}\nComment: ${body}\n${decisionLink}`,
					})
				)
		)).find((result) => !result.ok);
		if (commentFailed) {
			redirectWithError(decisionId, commentFailed.error ?? "Failed to send comment notification.");
		}
	}

	redirect(`/decisions/${decisionId}`);
}

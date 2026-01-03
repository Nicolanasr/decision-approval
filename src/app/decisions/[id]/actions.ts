"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

	const { data: decision, error: decisionError } = await supabase.from("decisions").select("status").eq("id", decisionId).single();

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

	const { error: statusError } = await supabase.rpc("update_decision_status_from_approvals", { target_decision_id: decisionId });

	if (statusError) {
		redirectWithError(decisionId, statusError.message);
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

	redirect(`/decisions/${decisionId}`);
}

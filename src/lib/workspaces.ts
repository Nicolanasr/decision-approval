import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

type WorkspaceMembership = {
	workspace_id: string;
	workspaces?:
		| {
				id: string;
				name: string;
				description: string | null;
		  }
		| null;
	is_default?: boolean | null;
};

export async function getWorkspaceMemberships(supabase: SupabaseClient, userId: string) {
	const { data } = await supabase
		.from("workspace_members")
		.select("workspace_id, is_default, workspaces(id,name,description)")
		.eq("user_id", userId)
		.order("created_at", { ascending: true });

	const normalized = (data ?? []).map((row) => {
		const workspace =
			row.workspaces && Array.isArray(row.workspaces) ? row.workspaces[0] ?? null : row.workspaces ?? null;
		return {
			workspace_id: row.workspace_id,
			workspaces: workspace,
			is_default: row.is_default ?? null,
		};
	});

	return normalized as WorkspaceMembership[];
}

export async function getActiveWorkspace(supabase: SupabaseClient, userId: string) {
	const membershipList = await getWorkspaceMemberships(supabase, userId);

	if (membershipList.length === 0) {
		return { workspace: null, membershipList };
	}

	const cookieStore = await cookies();
	const preferredId = cookieStore.get("workspace_id")?.value;
	const activeMembership =
		membershipList.find((member) => member.workspace_id === preferredId) ??
		membershipList.find((member) => member.is_default) ??
		membershipList[0];
	const workspaceInfo = activeMembership.workspaces ?? null;

	return {
		workspace: {
			id: activeMembership.workspace_id,
			name: workspaceInfo?.name ?? "Workspace",
			description: workspaceInfo?.description ?? null,
		},
		membershipList,
	};
}

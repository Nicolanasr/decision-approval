import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

type WorkspaceMembership = {
  workspace_id: string;
  workspaces?: {
    id: string;
    name: string;
    description: string | null;
  } | null;
};

export async function getWorkspaceMemberships(
  supabase: SupabaseClient,
  userId: string
) {
  const { data } = await supabase
    .from("workspace_members")
    .select("workspace_id, workspaces(id,name,description)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  return (data ?? []) as WorkspaceMembership[];
}

export async function getActiveWorkspace(
  supabase: SupabaseClient,
  userId: string
) {
  const membershipList = await getWorkspaceMemberships(supabase, userId);

  if (membershipList.length === 0) {
    return { workspace: null, membershipList };
  }

  const cookieStore = await cookies();
  const preferredId = cookieStore.get("workspace_id")?.value;
  const activeMembership =
    membershipList.find((member) => member.workspace_id === preferredId) ??
    membershipList[0];

  return {
    workspace: {
      id: activeMembership.workspace_id,
      name: activeMembership.workspaces?.name ?? "Workspace",
    },
    membershipList,
  };
}

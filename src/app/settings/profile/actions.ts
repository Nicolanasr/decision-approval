"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspaces";
import { profileSchema } from "@/lib/validation";

function redirectWithError(message: string): never {
  const params = new URLSearchParams({ error: message });
  redirect(`/settings/profile?${params.toString()}`);
}

export async function updateProfile(formData: FormData) {
  const parsed = profileSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    title: String(formData.get("title") ?? ""),
  });

  if (!parsed.success) {
    redirectWithError(parsed.error.errors[0]?.message ?? "Name and title are required.");
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

  const { error } = await supabase
    .from("workspace_members")
    .update({
      member_name: parsed.data.name,
      member_title: parsed.data.title,
    })
    .eq("workspace_id", activeWorkspace.id)
    .eq("user_id", authData.user.id);

  if (error) {
    redirectWithError(error.message);
  }

  redirect("/");
}

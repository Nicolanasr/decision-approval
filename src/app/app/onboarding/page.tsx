import { redirect } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createWorkspace } from "./actions";
import { SubmitButton } from "@/components/submit-button";

type SearchParams = {
  error?: string;
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/app/sign-in");
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("user_id", authData.user.id)
    .limit(1)
    .maybeSingle();

  if (membership) {
    redirect("/app");
  }

  const resolvedSearchParams = await searchParams;
  const errorMessage =
    typeof resolvedSearchParams?.error === "string"
      ? resolvedSearchParams.error
      : "";

  return (
    <div className="min-h-screen bg-neutral-50 px-6 py-12">
      <main className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
            Onboarding
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            Create your workspace
          </h1>
          <p className="text-sm text-neutral-500">
            Start by naming the workspace for your team.
          </p>
        </header>

        {errorMessage ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}

        <form action={createWorkspace} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Workspace name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Acme IT Ops"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              placeholder="What is this workspace for?"
            />
          </div>
          <SubmitButton type="submit" pendingText="Creating...">
            Create workspace
          </SubmitButton>
        </form>
      </main>
    </div>
  );
}

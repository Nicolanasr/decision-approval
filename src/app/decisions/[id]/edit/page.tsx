import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateDecision } from "./actions";
import { SubmitButton } from "@/components/submit-button";

type EditDecisionProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function EditDecisionPage({
  params,
  searchParams,
}: EditDecisionProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/sign-in");
  }

  const { data: decision, error } = await supabase
    .from("decisions")
    .select("id,title,summary,context,owner_user_id,workspace_id,status")
    .eq("id", resolvedParams.id)
    .single();

  if (error || !decision) {
    notFound();
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
    redirect(`/decisions/${decision.id}`);
  }

  if (decision.status !== "pending") {
    redirect(`/decisions/${decision.id}`);
  }

  const { data: members } = await supabase
    .from("workspace_members")
    .select("id,user_id,member_email,member_name,member_title")
    .eq("workspace_id", decision.workspace_id)
    .order("member_name", { ascending: true });

  const { data: approvers } = await supabase
    .from("decision_approvers")
    .select("approver_user_id")
    .eq("decision_id", decision.id);

  const approverSet = new Set(
    approvers?.map((row) => row.approver_user_id) ?? []
  );

  const errorMessage =
    typeof resolvedSearchParams?.error === "string"
      ? resolvedSearchParams.error
      : "";

  return (
    <div className="min-h-screen bg-neutral-50 px-6 py-12">
      <main className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
            Edit Decision
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            Update decision
          </h1>
          <p className="text-sm text-neutral-500">
            Only the creator or an admin can edit this decision.
          </p>
        </header>

        {errorMessage ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}

        <form action={updateDecision} className="space-y-5">
          <input type="hidden" name="decisionId" value={decision.id} />
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              defaultValue={decision.title}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Input
              id="summary"
              name="summary"
              defaultValue={decision.summary}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="context">Context</Label>
            <textarea
              id="context"
              name="context"
              rows={6}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              defaultValue={decision.context}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Approvers</Label>
            <div className="space-y-2 rounded-md border border-input bg-background p-3 text-sm">
              {members && members.length > 0 ? (
                members.map((member) => (
                  <label key={member.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="approvers"
                      value={member.user_id ?? ""}
                      defaultChecked={approverSet.has(member.user_id)}
                      disabled={!member.user_id}
                      className="h-4 w-4"
                    />
                    <span className="text-neutral-700">
                      {member.member_name || member.member_email || "Member"}
                    </span>
                    {member.member_title ? (
                      <span className="text-xs text-neutral-400">
                        {member.member_title}
                      </span>
                    ) : null}
                    <span className="text-xs text-neutral-400">
                      {member.member_email ?? ""}
                    </span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-neutral-500">
                  No members yet. Add them in settings.
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <SubmitButton type="submit" pendingText="Saving...">
              Save changes
            </SubmitButton>
            <Button variant="outline" asChild>
              <Link href={`/decisions/${decision.id}`}>Cancel</Link>
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

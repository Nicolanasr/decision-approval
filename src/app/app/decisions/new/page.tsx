import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspaces";
import { createDecision } from "./actions";
import { SubmitButton } from "@/components/submit-button";
import { ApproverPicker } from "@/components/approver-picker";

type SearchParams = {
    error?: string;
    title?: string;
    summary?: string;
    context?: string;
    links?: string;
    approvers?: string;
};

export default async function NewDecisionPage({
    searchParams,
}: {
    searchParams?: Promise<SearchParams>;
}) {
    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();

    if (!authData.user) {
        redirect("/app/sign-in");
    }

    const resolvedSearchParams = await searchParams;
    const errorMessage =
        typeof resolvedSearchParams?.error === "string"
            ? resolvedSearchParams.error
            : "";
    const titleValue =
        typeof resolvedSearchParams?.title === "string"
            ? resolvedSearchParams.title
            : "";
    const summaryValue =
        typeof resolvedSearchParams?.summary === "string"
            ? resolvedSearchParams.summary
            : "";
    const contextValue =
        typeof resolvedSearchParams?.context === "string"
            ? resolvedSearchParams.context
            : "";
    const linksValue =
        typeof resolvedSearchParams?.links === "string"
            ? resolvedSearchParams.links
            : "";
    const selectedApprovers =
        typeof resolvedSearchParams?.approvers === "string"
            ? resolvedSearchParams.approvers
                  .split(",")
                  .map((value) => value.trim())
                  .filter(Boolean)
            : [];

    const { workspace: activeWorkspace } = await getActiveWorkspace(
        supabase,
        authData.user.id
    );

    if (!activeWorkspace) {
        redirect("/app/onboarding");
    }

    const { data: currentMembership } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", activeWorkspace.id)
        .eq("user_id", authData.user.id)
        .maybeSingle();

    if (currentMembership?.role === "auditor") {
        redirect("/app");
    }

    if (currentMembership?.role === "approver") {
        redirect("/app");
    }

    const { data: members } = await supabase
        .from("workspace_members")
        .select("id,user_id,member_email,member_name,member_title,role")
        .eq("workspace_id", activeWorkspace.id)
        .order("member_name", { ascending: true });

    return (
        <div className="min-h-screen bg-neutral-50 px-6 py-12">
            <main className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
                <header className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
                        New Decision
                    </p>
                    <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
                        Create a decision
                    </h1>
                    <p className="text-sm text-neutral-500">
                        Document the context for {activeWorkspace.name}, then assign
                        approvers to capture outcomes.
                    </p>
                </header>

                {errorMessage ? (
                    <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {errorMessage}
                    </p>
                ) : null}

                <form action={createDecision} className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            name="title"
                            placeholder="Decision title"
                            defaultValue={titleValue}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="summary">Summary</Label>
                        <Input
                            id="summary"
                            name="summary"
                            placeholder="One-sentence summary"
                            defaultValue={summaryValue}
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
                            placeholder="What led to this decision? Include constraints, trade-offs, and background."
                            defaultValue={contextValue}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="links">Related links (optional)</Label>
                        <textarea
                            id="links"
                            name="links"
                            rows={3}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                            placeholder={`Incident postmortem | https://example.com/postmortem\nRunbook - https://example.com/runbook`}
                            defaultValue={linksValue}
                        />
                        <p className="text-xs text-neutral-500">
                            One link per line. Use &quot;Label | URL&quot; or &quot;Label - URL&quot;.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label>Approvers</Label>
                        {members && members.length > 0 ? (
                            <ApproverPicker members={members} selectedApprovers={selectedApprovers} />
                        ) : (
                            <div className="rounded-md border border-input bg-background p-3 text-sm text-neutral-500">
                                No members yet. Add them in settings.
                            </div>
                        )}
                        <p className="text-xs text-neutral-500">
                            Approvers must already be members of this workspace.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <SubmitButton type="submit" pendingText="Creating...">
                            Create decision
                        </SubmitButton>
                        <Button variant="outline" asChild>
                            <Link href="/app">Cancel</Link>
                        </Button>
                    </div>
                </form>
            </main>
        </div>
    );
}

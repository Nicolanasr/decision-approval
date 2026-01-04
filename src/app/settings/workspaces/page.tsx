import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveWorkspace, getWorkspaceMemberships } from "@/lib/workspaces";
import { createWorkspace, switchWorkspace } from "./actions";
import { SubmitButton } from "@/components/submit-button";

type SearchParams = {
  error?: string;
};

export const dynamic = "force-dynamic";

export default async function WorkspacesPage({
  searchParams,
}: {
    searchParams?: Promise<SearchParams>;
}) {
    const resolvedSearchParams = await searchParams;
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

    const memberships = await getWorkspaceMemberships(
        supabase,
        authData.user.id
    );

    const errorMessage =
        typeof resolvedSearchParams?.error === "string"
            ? resolvedSearchParams.error
            : "";

    return (
        <div className="min-h-screen bg-neutral-50 px-6 py-12">
            <main className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
                <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
                            Workspace
                        </p>
                        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
                            Switch workspace
                        </h1>
                    </div>
                    <Button variant="outline" asChild>
                        <Link href="/">Back to log</Link>
                    </Button>
                </header>

                {errorMessage ? (
                    <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {errorMessage}
                    </p>
                ) : null}

                <section className="rounded-xl border border-neutral-200 bg-white p-5">
                    <h2 className="text-base font-semibold text-neutral-900">
                        Create workspace
                    </h2>
                    <form action={createWorkspace} className="mt-4 space-y-4">
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
                </section>

                <section className="rounded-xl border border-neutral-200 bg-white p-5">
                    <h2 className="text-base font-semibold text-neutral-900">
                        Your workspaces
                    </h2>
                    <div className="mt-4 space-y-3">
                        {memberships.length > 0 ? (
                            memberships.map((membership) => {
                                const isActive =
                                    activeWorkspace.id === membership.workspace_id;
                                return (
                                    <div
                                        key={membership.workspace_id}
                                        className="flex flex-col gap-3 border-b border-neutral-100 pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-neutral-800">
                                                {membership.workspaces?.name ?? "Workspace"}
                                            </p>
                                            <p className="text-xs text-neutral-500">
                                                {membership.workspaces?.description ?? "No description"}
                                            </p>
                                            <p className="text-xs text-neutral-400">
                                                {membership.workspace_id}
                                            </p>
                                        </div>
                                        {isActive ? (
                                            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                                                Active
                                            </span>
                                        ) : (
                                            <form action={switchWorkspace}>
                                                <input
                                                    type="hidden"
                                                    name="workspaceId"
                                                    value={membership.workspace_id}
                                                />
                                                <SubmitButton
                                                    type="submit"
                                                    variant="outline"
                                                    size="sm"
                                                    pendingText="Switching..."
                                                >
                                                    Switch
                                                </SubmitButton>
                                            </form>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-sm text-neutral-500">
                                You are not part of any workspace yet.
                            </p>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}

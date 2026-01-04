import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspaces";
import { createInvite, updateMember, removeMember } from "./actions";
import { SubmitButton } from "@/components/submit-button";
import { MembersList } from "@/components/members-list";
import { Input } from "@/components/ui/input";

type SearchParams = {
    error?: string;
    invite?: string;
    title?: string;
    role?: string;
    name?: string;
};

export const dynamic = "force-dynamic";

export default async function MembersPage({
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

    const { data: members } = await supabase
        .from("workspace_members")
        .select("id,user_id,member_name,member_email,member_title,role")
        .eq("workspace_id", activeWorkspace.id)
        .order("member_name", { ascending: true });

    const errorMessage =
        typeof resolvedSearchParams?.error === "string"
            ? resolvedSearchParams.error
            : "";
    const inviteToken =
        typeof resolvedSearchParams?.invite === "string"
            ? resolvedSearchParams.invite
            : "";
    const inviteTitle =
        typeof resolvedSearchParams?.title === "string"
            ? resolvedSearchParams.title
            : "";
    const inviteRole =
        typeof resolvedSearchParams?.role === "string"
            ? resolvedSearchParams.role
            : "";

    const { data: currentMembership } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", activeWorkspace.id)
        .eq("user_id", authData.user.id)
        .maybeSingle();

    const isAdmin = currentMembership?.role === "admin";

    if (currentMembership?.role === "member") {
        redirect("/");
    }

    return (
        <div className="min-h-screen bg-neutral-50 px-6 py-12">
            <main className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
                <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
                            Workspace
                        </p>
                        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
                            Members
                        </h1>
                        <p className="text-xs text-neutral-500">
                            {activeWorkspace.name}
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Button variant="outline" asChild>
                            <Link href="/settings/workspaces">Switch workspace</Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href="/">Back to log</Link>
                        </Button>
                    </div>
                </header>

                {errorMessage ? (
                    <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {errorMessage}
                    </p>
                ) : null}

                {isAdmin ? (
                    <section className="rounded-xl border border-neutral-200 bg-white p-5">
                        <h2 className="text-base font-semibold text-neutral-900">
                            Invite by email
                        </h2>
                        <form action={createInvite} className="mt-4 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="invite-email">Email</Label>
                                <Input
                                    id="invite-email"
                                    name="email"
                                    type="email"
                                    placeholder="new.member@company.com"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="invite-title">Role / Title</Label>
                                <Input
                                    id="invite-title"
                                    name="title"
                                    placeholder="IT Manager, Security Lead..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="invite-name">Name</Label>
                                <Input
                                    id="invite-name"
                                    name="name"
                                    placeholder="Full name"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="invite-role">Workspace role</Label>
                                <select
                                    id="invite-role"
                                    name="role"
                                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                                    defaultValue="member"
                                >
                                    <option value="member">Member</option>
                                    <option value="approver">Approver</option>
                                    <option value="auditor">Auditor</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <SubmitButton type="submit" variant="outline" pendingText="Creating...">
                                Create and send invite link
                            </SubmitButton>
                        </form>
                        {inviteToken ? (
                            <div className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">
                                Share this invite link:{" "}
                                <span className="break-all font-medium">
                                    {`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/invites/${inviteToken}${inviteTitle || resolvedSearchParams?.name
                                            ? `?${new URLSearchParams({
                                                ...(resolvedSearchParams?.name
                                                    ? { name: String(resolvedSearchParams.name) }
                                                    : {}),
                                                ...(inviteTitle
                                                    ? { title: inviteTitle }
                                                    : {}),
                                            }).toString()}`
                                            : ""
                                        }`}
                                </span>
                                {inviteTitle ? (
                                    <span className="mt-2 block text-xs text-neutral-500">
                                        Suggested role/title: {inviteTitle}
                                    </span>
                                ) : null}
                                {resolvedSearchParams?.name ? (
                                    <span className="mt-1 block text-xs text-neutral-500">
                                        Suggested name: {resolvedSearchParams?.name}
                                    </span>
                                ) : null}
                                {inviteRole ? (
                                    <span className="mt-1 block text-xs text-neutral-500">
                                        Workspace role: {inviteRole}
                                    </span>
                                ) : null}
                            </div>
                        ) : null}
                    </section>
                ) : null}

                <section className="rounded-xl border border-neutral-200 bg-white p-5">
                    <h2 className="text-base font-semibold text-neutral-900">
                        Current members
                    </h2>
                    <div className="mt-4">
                        <MembersList
                            members={members ?? []}
                            isAdmin={isAdmin}
                            currentUserId={authData.user.id}
                            updateMember={updateMember}
                            removeMember={removeMember}
                        />
                    </div>
                </section>
            </main>
        </div>
    );
}

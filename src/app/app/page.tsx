import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspaces";

type SearchParams = {
    status?: string;
    q?: string;
    page?: string;
    assigned?: string;
};

const statusTabs = [
    { label: "All", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
];

export default async function Home({
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
    const status =
        typeof resolvedSearchParams?.status === "string"
            ? resolvedSearchParams.status
            : "all";
    const query =
        typeof resolvedSearchParams?.q === "string"
            ? resolvedSearchParams.q.trim()
            : "";
    const assignedOnly =
        typeof resolvedSearchParams?.assigned === "string" &&
        resolvedSearchParams.assigned === "1";
    const page = Math.max(
        1,
        Number(
            typeof resolvedSearchParams?.page === "string"
                ? resolvedSearchParams.page
                : "1"
        ) || 1
    );
    const pageSize = 10;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

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

    const isAuditor = currentMembership?.role === "auditor";
    const isAdmin = currentMembership?.role === "admin";
    const isApprover = currentMembership?.role === "approver";

    const { data: assignedApprovals } = isAuditor
        ? { data: [] as { decision_id: string; status: string }[] }
        : await supabase
            .from("decision_approvers")
            .select("decision_id,status")
            .eq("approver_user_id", authData.user.id);

    const assignedDecisionIds =
        assignedApprovals?.map((row) => row.decision_id) ?? [];
    const pendingMyApproval = new Set(
        assignedApprovals
            ?.filter((row) => row.status === "pending")
            .map((row) => row.decision_id) ?? []
    );

    const matchDecisionIds = new Set<string>();

    if (query) {
        const { data: directMatches } = await supabase
            .from("decisions")
            .select("id")
            .eq("workspace_id", activeWorkspace.id)
            .or(
                `title.ilike.%${query}%,summary.ilike.%${query}%,context.ilike.%${query}%`
            );

        directMatches?.forEach((row) => matchDecisionIds.add(row.id));

        const { data: memberMatches } = await supabase
            .from("workspace_members")
            .select("user_id")
            .eq("workspace_id", activeWorkspace.id)
            .or(
                `member_name.ilike.%${query}%,member_email.ilike.%${query}%,member_title.ilike.%${query}%`
            );

        const memberIds = memberMatches?.map((row) => row.user_id) ?? [];

        if (memberIds.length > 0) {
            const { data: approverMatches } = await supabase
                .from("decision_approvers")
                .select("decision_id")
                .in("approver_user_id", memberIds);
            approverMatches?.forEach((row) => matchDecisionIds.add(row.decision_id));

            const { data: ownerMatches } = await supabase
                .from("decisions")
                .select("id")
                .eq("workspace_id", activeWorkspace.id)
                .in("owner_user_id", memberIds);
            ownerMatches?.forEach((row) => matchDecisionIds.add(row.id));
        }

        const { data: linkMatches } = await supabase
            .from("decision_links")
            .select("decision_id, decisions!inner(workspace_id)")
            .eq("decisions.workspace_id", activeWorkspace.id)
            .or(`label.ilike.%${query}%,url.ilike.%${query}%`);
        linkMatches?.forEach((row) => matchDecisionIds.add(row.decision_id));
    }

    let decisionsQuery = supabase
        .from("decisions")
        .select("id,title,summary,status,created_at,owner_user_id", {
            count: "exact",
        })
        .eq("workspace_id", activeWorkspace.id);

    if (assignedOnly) {
        if (assignedDecisionIds.length > 0) {
            decisionsQuery = decisionsQuery.in("id", assignedDecisionIds);
        } else {
            decisionsQuery = decisionsQuery.in("id", []);
        }
    } else if (!isAuditor && !isAdmin) {
        if (assignedDecisionIds.length > 0) {
            decisionsQuery = decisionsQuery.or(
                `owner_user_id.eq.${authData.user.id},id.in.(${assignedDecisionIds.join(",")})`
            );
        } else {
            decisionsQuery = decisionsQuery.eq("owner_user_id", authData.user.id);
        }
    }

    if (status !== "all") {
        decisionsQuery = decisionsQuery.eq("status", status);
    }

    if (query) {
        if (matchDecisionIds.size > 0) {
            decisionsQuery = decisionsQuery.in("id", [...matchDecisionIds]);
        } else {
            decisionsQuery = decisionsQuery.in("id", []);
        }
    }

    const { data: decisions, count } = await decisionsQuery
        .order("created_at", { ascending: false })
        .range(from, to);

    const decisionIds = decisions?.map((decision) => decision.id) ?? [];
    const { data: approvals } =
        decisionIds.length > 0
            ? await supabase
                .from("decision_approvers")
                .select("decision_id,approver_user_id,status")
                .in("decision_id", decisionIds)
                .eq("status", "pending")
            : { data: [] as { decision_id: string; approver_user_id: string }[] };

    const { data: members } = await supabase
        .from("workspace_members")
        .select("user_id,member_name,member_email")
        .eq("workspace_id", activeWorkspace.id);

    const memberLookup = new Map(
        members?.map((member) => [member.user_id, member]) ?? []
    );

    const totalCount = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const buildPageLink = (nextPage: number) => {
        const params = new URLSearchParams();
        if (status !== "all") {
            params.set("status", status);
        }
        if (query) {
            params.set("q", query);
        }
        if (assignedOnly) {
            params.set("assigned", "1");
        }
        if (nextPage > 1) {
            params.set("page", String(nextPage));
        }
        const queryString = params.toString();
        return queryString ? `/app?${queryString}` : "/app";
    };

    return (
        <div className="min-h-screen bg-neutral-50 px-6 py-12">
            <main className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
                            Decision Log
                        </h1>
                        <p className="text-xs text-neutral-500">
                            {activeWorkspace.name}
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Button variant="outline" asChild>
                            <Link href="/app/settings/workspaces">Switch workspace</Link>
                        </Button>
                        {isAuditor ? (
                            <span className="text-xs font-medium text-neutral-400">
                                Read-only
                            </span>
                        ) : isApprover ? <></> : (
                            <Button asChild>
                                <Link href="/app/decisions/new">New decision</Link>
                            </Button>
                        )}
                    </div>
                </header>

                <section className="flex flex-col gap-3">
                    <nav className="flex flex-wrap gap-2">
                        {statusTabs.map((tab) => {
                            const isActive = status === tab.value;
                            const href = (() => {
                                const params = new URLSearchParams();
                                if (tab.value !== "all") {
                                    params.set("status", tab.value);
                                }
                                if (query) {
                                    params.set("q", query);
                                }
                                if (assignedOnly) {
                                    params.set("assigned", "1");
                                }
                                const queryString = params.toString();
                                return queryString ? `/app?${queryString}` : "/app";
                            })();
                            return (
                                <Button
                                    key={tab.value}
                                    variant={isActive ? "default" : "outline"}
                                    size="sm"
                                    asChild
                                >
                                    <Link href={href}>{tab.label}</Link>
                                </Button>
                            );
                        })}
                    </nav>
                    <form className="flex flex-col gap-3 sm:flex-row sm:items-start">
                        <div className="flex w-full flex-col gap-2">
                            <Input
                                name="q"
                            placeholder="Search decisions, approvers, links..."
                                defaultValue={query}
                            />
                            <label className="flex items-center gap-2 text-xs text-neutral-500">
                                <input
                                    type="checkbox"
                                    name="assigned"
                                    value="1"
                                    defaultChecked={assignedOnly}
                                    className="h-4 w-4 rounded border-neutral-300"
                                />
                                Assigned to me
                            </label>
                        </div>
                        {status !== "all" ? (
                            <input type="hidden" name="status" value={status} />
                        ) : null}
                        <Button type="submit">Search</Button>
                    </form>
                </section>

                <section className="space-y-4">
                    {decisions && decisions.length > 0 ? (
                        decisions.map((decision) => (
                            <Link
                                key={decision.id}
                                href={`/app/decisions/${decision.id}`}
                                className="rounded-xl border border-neutral-200 bg-white p-5 transition hover:border-neutral-300 block"
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <h2 className="text-lg font-semibold text-neutral-900">
                                        {decision.title}
                                    </h2>
                                    <span
                                        className={`text-xs font-semibold uppercase tracking-wide ${decision.status === "approved"
                                            ? "text-emerald-600"
                                            : decision.status === "rejected"
                                                ? "text-red-600"
                                                : "text-amber-600"
                                            }`}
                                    >
                                        {decision.status}
                                    </span>
                                </div>
                                <p className="mt-2 text-sm text-neutral-600">
                                    {decision.summary}
                                </p>
                                {decision.status === "pending" ? (
                                    <div className="mt-3 text-xs text-neutral-500">
                                        <span
                                            className={
                                                pendingMyApproval.has(decision.id)
                                                    ? "font-semibold text-amber-700"
                                                    : ""
                                            }
                                        >
                                            Pending approvals
                                        </span>
                                        <span className="ml-2 text-neutral-400">
                                            {approvals
                                                ?.filter((row) => row.decision_id === decision.id)
                                                .map(
                                                    (row) =>
                                                        memberLookup.get(row.approver_user_id)?.member_name ||
                                                        memberLookup.get(row.approver_user_id)?.member_email ||
                                                        "Member"
                                                )
                                                .join(", ") || "None"}
                                        </span>
                                    </div>
                                ) : null}
                                <p className="mt-2 text-xs text-neutral-500">
                                    Created by{" "}
                                    {memberLookup.get(decision.owner_user_id)?.member_name ||
                                        memberLookup.get(decision.owner_user_id)?.member_email ||
                                        "Unknown"}
                                </p>
                                <p className="mt-3 text-xs text-neutral-400">
                                    {new Date(decision.created_at).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                    })}
                                </p>
                            </Link>
                        ))
                    ) : (
                        <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
                            No decisions match your filters yet.
                        </div>
                    )}
                </section>

                <section className="flex items-center justify-between text-sm text-neutral-500">
                    <span>
                        Page {page} of {totalPages}
                    </span>
                    <div className="flex items-center gap-2">
                        {page > 1 ? (
                            <Button variant="outline" size="sm" asChild>
                                <Link href={buildPageLink(page - 1)}>Previous</Link>
                            </Button>
                        ) : (
                            <Button variant="outline" size="sm" disabled>
                                Previous
                            </Button>
                        )}
                        {page < totalPages ? (
                            <Button variant="outline" size="sm" asChild>
                                <Link href={buildPageLink(page + 1)}>Next</Link>
                            </Button>
                        ) : (
                            <Button variant="outline" size="sm" disabled>
                                Next
                            </Button>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}

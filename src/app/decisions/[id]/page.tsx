import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/submit-button";
import { addComment, updateApproval } from "./actions";

type DecisionPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function DecisionDetailPage({
  params,
  searchParams,
}: DecisionPageProps) {
  const resolvedParams = await params;
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/sign-in");
  }

  const { data: decision, error } = await supabase
    .from("decisions")
    .select(
      "id,title,summary,context,status,created_at,owner_user_id,workspace_id"
    )
    .eq("id", resolvedParams.id)
    .single();

  if (error || !decision) {
    notFound();
  }

  const { data: approvers } = await supabase
    .from("decision_approvers")
    .select("id,approver_user_id,status,decided_at")
    .eq("decision_id", resolvedParams.id);

  const { data: members } = await supabase
    .from("workspace_members")
    .select("user_id,member_email,member_name,member_title")
    .eq("workspace_id", decision.workspace_id);

  const memberLookup = new Map(
    members?.map((member) => [member.user_id, member]) ?? []
  );

  const { data: events } = await supabase
    .from("decision_events")
    .select("id,type,created_at,actor_user_id,metadata_json")
    .eq("decision_id", resolvedParams.id)
    .order("created_at", { ascending: false });

  const { data: comments } = await supabase
    .from("decision_comments")
    .select("id,body,created_at,user_id")
    .eq("decision_id", resolvedParams.id)
    .order("created_at", { ascending: false });

  const resolvedSearchParams = await searchParams;
  const errorMessage =
    typeof resolvedSearchParams?.error === "string"
      ? resolvedSearchParams.error
      : "";
  const currentApprover = approvers?.find(
    (row) => row.approver_user_id === authData.user?.id
  );
  const canAct = currentApprover?.status === "pending";

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", decision.workspace_id)
    .eq("user_id", authData.user.id)
    .maybeSingle();

  const canEdit =
    decision.status === "pending" &&
    (decision.owner_user_id === authData.user.id ||
      membership?.role === "admin");

  return (
    <div className="min-h-screen bg-neutral-50 px-6 py-12">
      <main className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
              Decision Detail
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
              {decision.title}
            </h1>
            <p className="text-sm text-neutral-500">{decision.summary}</p>
            <p className="text-xs text-neutral-500">
              Created by{" "}
              {memberLookup.get(decision.owner_user_id)?.member_name ||
                memberLookup.get(decision.owner_user_id)?.member_email ||
                "Unknown"}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {canEdit ? (
              <Button variant="outline" asChild>
                <Link href={`/decisions/${decision.id}/edit`}>Edit</Link>
              </Button>
            ) : null}
            {canAct ? (
              <>
                <form action={updateApproval}>
                  <input type="hidden" name="decisionId" value={decision.id} />
                  <input type="hidden" name="action" value="approve" />
                  <SubmitButton type="submit" pendingText="Approving...">
                    Approve
                  </SubmitButton>
                </form>
                <form action={updateApproval}>
                  <input type="hidden" name="decisionId" value={decision.id} />
                  <input type="hidden" name="action" value="reject" />
                  <SubmitButton
                    type="submit"
                    variant="destructive"
                    pendingText="Rejecting..."
                  >
                    Reject
                  </SubmitButton>
                </form>
              </>
            ) : null}
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

        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
            <section className="rounded-xl border border-neutral-200 bg-white p-5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {decision.status}
                </span>
              </div>
              <p className="mt-3 text-sm text-neutral-600 whitespace-pre-line">
                {decision.context}
              </p>
              <p className="mt-4 text-xs text-neutral-400">
                Created{" "}
                {new Date(decision.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              {canAct ? (
                <p className="mt-5 text-xs text-neutral-400">
                  Awaiting your approval.
                </p>
              ) : null}
            </section>

            <section className="rounded-xl border border-neutral-200 bg-white p-5">
              <h2 className="text-base font-semibold text-neutral-900">
                Approvers
              </h2>
              <div className="mt-3 space-y-2 text-sm text-neutral-600">
                {approvers && approvers.length > 0 ? (
                  approvers.map((approver) => (
                    <div
                      key={approver.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex flex-col">
                        <span className="text-neutral-700">
                          {memberLookup.get(approver.approver_user_id)?.member_name ||
                            memberLookup.get(approver.approver_user_id)
                              ?.member_email ||
                            approver.approver_user_id}
                        </span>
                        {memberLookup.get(approver.approver_user_id)
                          ?.member_title ? (
                          <span className="text-xs text-neutral-400">
                            {
                              memberLookup.get(approver.approver_user_id)
                                ?.member_title
                            }
                          </span>
                        ) : null}
                        <span className="text-xs text-neutral-400">
                          {memberLookup.get(approver.approver_user_id)
                            ?.member_email ?? ""}
                        </span>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        {approver.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-neutral-500">
                    No approvers assigned yet.
                  </p>
                )}
              </div>
            </section>
          </div>

        </div>

        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="text-base font-semibold text-neutral-900">Comments</h2>
          <form action={addComment} className="mt-4 space-y-3">
            <input type="hidden" name="decisionId" value={decision.id} />
            <textarea
              name="body"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              placeholder="Add a comment..."
              required
            />
            <SubmitButton type="submit" variant="outline" pendingText="Posting...">
              Post comment
            </SubmitButton>
          </form>
          <div className="mt-4 space-y-3">
            {comments && comments.length > 0 ? (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>
                      {memberLookup.get(comment.user_id)?.member_name ||
                        memberLookup.get(comment.user_id)?.member_email ||
                        "Unknown"}
                    </span>
                    <span>
                      {new Date(comment.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm text-neutral-700">
                    {comment.body}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-neutral-500">
                No comments yet. Start the discussion.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="text-base font-semibold text-neutral-900">
            Audit trail
          </h2>
          <div className="mt-4 space-y-3">
            {events && events.length > 0 ? (
              events.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-col gap-1 border-l border-neutral-200 pl-4 text-sm"
                >
                  <span className="font-medium text-neutral-800">
                    {event.type}
                  </span>
                  <span className="text-xs text-neutral-400">
                    {new Date(event.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                  {event.actor_user_id ? (
                    <span className="text-xs text-neutral-500">
                      {memberLookup.get(event.actor_user_id)?.member_name ||
                        "Unknown"}
                      {memberLookup.get(event.actor_user_id)?.member_email
                        ? ` (${memberLookup.get(event.actor_user_id)?.member_email})`
                        : ""}
                    </span>
                  ) : null}
                  {event.type === "edited" &&
                  event.metadata_json &&
                  typeof event.metadata_json === "object" &&
                  "changes" in event.metadata_json ? (
                    <div className="mt-2 space-y-2 text-xs text-neutral-500">
                      {Object.entries(
                        (event.metadata_json as { changes: Record<string, { from: string | null; to: string | null }> })
                          .changes
                      ).map(([field, diff]) => (
                        <div key={field} className="rounded-md bg-neutral-50 px-2 py-1">
                          <span className="font-medium capitalize">{field}:</span>{" "}
                          <span className="text-neutral-400">"{diff.from ?? ""}"</span>{" "}
                          <span className="text-neutral-600">→</span>{" "}
                          <span className="text-neutral-700">"{diff.to ?? ""}"</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {event.type === "approvers_updated" &&
                  event.metadata_json &&
                  typeof event.metadata_json === "object" &&
                  "added" in event.metadata_json ? (
                    <div className="mt-2 space-y-2 text-xs text-neutral-500">
                      {(
                        event.metadata_json as {
                          added: string[];
                          removed: string[];
                        }
                      ).added.length > 0 ? (
                        <div className="rounded-md bg-neutral-50 px-2 py-1">
                          <span className="font-medium">Added:</span>{" "}
                          {(
                            event.metadata_json as {
                              added: string[];
                              removed: string[];
                            }
                          ).added
                            .map(
                              (id) =>
                                memberLookup.get(id)?.member_name ||
                                memberLookup.get(id)?.member_email ||
                                id
                            )
                            .join(", ")}
                        </div>
                      ) : null}
                      {(
                        event.metadata_json as {
                          added: string[];
                          removed: string[];
                        }
                      ).removed.length > 0 ? (
                        <div className="rounded-md bg-neutral-50 px-2 py-1">
                          <span className="font-medium">Removed:</span>{" "}
                          {(
                            event.metadata_json as {
                              added: string[];
                              removed: string[];
                            }
                          ).removed
                            .map(
                              (id) =>
                                memberLookup.get(id)?.member_name ||
                                memberLookup.get(id)?.member_email ||
                                id
                            )
                            .join(", ")}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-neutral-500">
                No events recorded yet.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

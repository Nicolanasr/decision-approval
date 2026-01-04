import { redirect, notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";

type PrintPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DecisionPrintPage({ params }: PrintPageProps) {
  const resolvedParams = await params;
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/app/sign-in");
  }

  const { data: decision, error } = await supabase
    .from("decisions")
    .select("id,title,summary,context,status,created_at,owner_user_id,workspace_id")
    .eq("id", resolvedParams.id)
    .single();

  if (error || !decision) {
    notFound();
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("name")
    .eq("id", decision.workspace_id)
    .maybeSingle();

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
    .order("created_at", { ascending: true });

  const { data: comments } = await supabase
    .from("decision_comments")
    .select("id,body,created_at,user_id")
    .eq("decision_id", resolvedParams.id)
    .order("created_at", { ascending: true });

  const { data: links } = await supabase
    .from("decision_links")
    .select("id,label,url")
    .eq("decision_id", resolvedParams.id)
    .order("created_at", { ascending: true });

  return (
    <div className="min-h-screen bg-white px-8 py-10 text-neutral-900 print-container">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-8">
        <header className="flex items-start justify-between gap-6">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">
              Decision Record
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              {decision.title}
            </h1>
            <p className="text-sm text-neutral-600">{decision.summary}</p>
            <div className="text-xs text-neutral-500">
              Workspace: {workspace?.name ?? "Workspace"}
            </div>
            <div className="text-xs text-neutral-500">
              Record ID: {decision.id}
            </div>
            <div className="text-xs text-neutral-500">
              Status:{" "}
              <span className="font-semibold uppercase">{decision.status}</span>
            </div>
            <div className="text-xs text-neutral-500">
              Created by{" "}
              {memberLookup.get(decision.owner_user_id)?.member_name ||
                memberLookup.get(decision.owner_user_id)?.member_email ||
                "Unknown"}
            </div>
            <div className="text-xs text-neutral-400">
              {new Date(decision.created_at).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </div>
          </div>
          <PrintButton />
        </header>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Context</h2>
          <p className="whitespace-pre-line text-sm text-neutral-700">
            {decision.context}
          </p>
        </section>

        {links && links.length > 0 ? (
          <section className="space-y-2">
            <h2 className="text-base font-semibold">Related links</h2>
            <ul className="space-y-1 text-sm text-neutral-700">
              {links.map((link) => (
                <li key={link.id}>
                  <span className="font-medium">{link.label}</span>:{" "}
                  <span className="text-neutral-500">{link.url}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Approvers</h2>
          <ul className="space-y-1 text-sm text-neutral-700">
            {approvers && approvers.length > 0 ? (
              approvers.map((approver) => (
                <li key={approver.id}>
                  {memberLookup.get(approver.approver_user_id)?.member_name ||
                    memberLookup.get(approver.approver_user_id)?.member_email ||
                    "Member"}{" "}
                  <span className="text-neutral-500">
                    ({approver.status})
                  </span>
                </li>
              ))
            ) : (
              <li className="text-neutral-500">No approvers assigned.</li>
            )}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Audit trail</h2>
          <ul className="space-y-2 text-sm text-neutral-700">
            {events && events.length > 0 ? (
              events.map((event) => (
                <li key={event.id}>
                  <span className="font-medium">{event.type}</span>{" "}
                  <span className="text-neutral-500">
                    {new Date(event.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                  {event.actor_user_id ? (
                    <span className="text-neutral-500">
                      {" "}
                      —{" "}
                      {memberLookup.get(event.actor_user_id)?.member_name ||
                        memberLookup.get(event.actor_user_id)?.member_email ||
                        "Unknown"}
                    </span>
                  ) : null}
                </li>
              ))
            ) : (
              <li className="text-neutral-500">No events recorded.</li>
            )}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Comments</h2>
          <ul className="space-y-2 text-sm text-neutral-700">
            {comments && comments.length > 0 ? (
              comments.map((comment) => (
                <li key={comment.id} className="space-y-1">
                  <div className="text-xs text-neutral-500">
                    {memberLookup.get(comment.user_id)?.member_name ||
                      memberLookup.get(comment.user_id)?.member_email ||
                      "Unknown"}{" "}
                    ·{" "}
                    {new Date(comment.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                  <p className="whitespace-pre-line">{comment.body}</p>
                </li>
              ))
            ) : (
              <li className="text-neutral-500">No comments.</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

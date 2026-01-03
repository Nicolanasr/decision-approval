import { redirect } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { acceptInvite } from "./actions";
import { SubmitButton } from "@/components/submit-button";

type InvitePageProps = {
    params: Promise<{
        token: string;
    }>;
    searchParams?: Promise<{
        error?: string;
        name?: string;
        title?: string;
    }>;
};

export default async function InvitePage({
    params,
    searchParams,
}: InvitePageProps) {
    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;
    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();

    if (!authData.user) {
        redirect(`/sign-in?message=${encodeURIComponent("Sign in to accept invite.")}`);
    }

    const errorMessage =
        typeof resolvedSearchParams?.error === "string"
            ? resolvedSearchParams.error
            : "";

  const { data: workspace } = await supabase
    .rpc("get_invite_workspace", { invite_token: resolvedParams.token })
    .maybeSingle();

  const { data: invite } = await supabase
    .from("workspace_invites")
    .select("role")
    .eq("token", resolvedParams.token)
    .maybeSingle();

    return (
        <div className="min-h-screen bg-neutral-50 px-6 py-12">
            <main className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
                <header className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
                        Workspace Invite
                    </p>
                    <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            Join {workspace?.workspace_name ?? "the workspace"}
          </h1>
          <p className="text-sm text-neutral-500">
            {workspace?.workspace_description ??
              "Accept the invite to access decisions and approvals."}
          </p>
                </header>

                {errorMessage ? (
                    <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {errorMessage}
                    </p>
                ) : null}

                <form action={acceptInvite} className="space-y-4">
                    <input type="hidden" name="token" value={resolvedParams.token} />
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="Your name"
                            defaultValue={resolvedSearchParams?.name ?? ""}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="title">Role / Title</Label>
                        <Input
                            id="title"
                            name="title"
                            placeholder="Your role or title"
                            defaultValue={resolvedSearchParams?.title ?? ""}
                        />
                    </div>
                    {invite?.role ? (
                        <div className="text-xs text-neutral-500">
                            Workspace role: {invite.role}
                        </div>
                    ) : null}
                    <SubmitButton type="submit" pendingText="Accepting...">
                        Accept invite
                    </SubmitButton>
                </form>
            </main>
        </div>
    );
}

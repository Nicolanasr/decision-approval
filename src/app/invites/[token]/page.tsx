import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { acceptInvite } from "./actions";
import { SubmitButton } from "@/components/submit-button";

type InvitePageProps = {
  params: Promise<{
    token: string;
  }>;
  searchParams?: Promise<{
    error?: string;
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

  return (
    <div className="min-h-screen bg-neutral-50 px-6 py-12">
      <main className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
            Workspace Invite
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            Join the workspace
          </h1>
          <p className="text-sm text-neutral-500">
            Accept the invite to access decisions and approvals.
          </p>
        </header>

        {errorMessage ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}

        <form action={acceptInvite}>
          <input type="hidden" name="token" value={resolvedParams.token} />
          <SubmitButton type="submit" pendingText="Accepting...">
            Accept invite
          </SubmitButton>
        </form>
      </main>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspaces";
import { updateProfile } from "./actions";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";

type SearchParams = {
    error?: string;
};

export const dynamic = "force-dynamic";

export default async function ProfilePage({
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

    const { data: member } = await supabase
        .from("workspace_members")
        .select("member_name,member_title,member_email")
        .eq("workspace_id", activeWorkspace.id)
        .eq("user_id", authData.user.id)
        .maybeSingle();

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
                            Profile
                        </p>
                        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
                            Your details
                        </h1>
                        <p className="text-xs text-neutral-500">
                            {activeWorkspace.name}
                        </p>
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
                    <form action={updateProfile} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                name="name"
                                defaultValue={member?.member_name ?? ""}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="title">Role / Title</Label>
                            <Input
                                id="title"
                                name="title"
                                defaultValue={member?.member_title ?? ""}
                                required
                            />
                        </div>
                        <div className="text-xs text-neutral-500">
                            Email: {member?.member_email ?? authData.user.email}
                        </div>
                        <SubmitButton type="submit" pendingText="Saving...">
                            Save profile
                        </SubmitButton>
                    </form>
                </section>
            </main>
        </div>
    );
}

import Link from "next/link";
import { updatePassword } from "../actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";

type SearchParams = {
  error?: string;
  message?: string;
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const errorMessage =
    typeof resolvedSearchParams?.error === "string"
      ? resolvedSearchParams.error
      : "";
  const infoMessage =
    typeof resolvedSearchParams?.message === "string"
      ? resolvedSearchParams.message
      : "";
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-neutral-50 px-6 py-20">
      <div className="mx-auto w-full max-w-md">
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Set a new password</CardTitle>
            <p className="text-sm text-muted-foreground">
              Choose a new password for your account.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {errorMessage ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errorMessage}
              </p>
            ) : null}
            {infoMessage ? (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {infoMessage}
              </p>
            ) : null}
            {!user ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                This reset link is invalid or expired. Request a new one.
              </div>
            ) : null}
            <form action={updatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                />
              </div>
              <SubmitButton type="submit" className="w-full" pendingText="Updating...">
                Update password
              </SubmitButton>
            </form>
            <p className="text-sm text-muted-foreground">
              Back to{" "}
              <Link href="/app/sign-in" className="font-medium text-foreground">
                sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

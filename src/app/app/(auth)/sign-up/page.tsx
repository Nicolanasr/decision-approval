import Link from "next/link";
import { signInWithGoogle, signUp } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { FaGoogle } from "react-icons/fa";

type SearchParams = {
  error?: string;
  message?: string;
};

export default async function SignUpPage({
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

  return (
    <div className="min-h-screen bg-neutral-50 px-6 py-20">
      <div className="mx-auto w-full max-w-md">
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <p className="text-sm text-muted-foreground">
              Start logging decisions for your team.
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
            <form action={signUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                />
              </div>
              <SubmitButton
                type="submit"
                className="w-full"
                pendingText="Creating account..."
              >
                Create account
              </SubmitButton>
            </form>
            <div className="flex items-center gap-3 text-xs uppercase text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              Or continue with
              <span className="h-px flex-1 bg-border" />
            </div>
            <form action={signInWithGoogle}>
              <SubmitButton
                type="submit"
                variant="outline"
                className="w-full"
                pendingText="Connecting..."
              >
                <span className="flex items-center justify-center gap-2">
                  <FaGoogle className="h-4 w-4" />
                  Continue with Google
                </span>
              </SubmitButton>
            </form>
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/app/sign-in" className="font-medium text-foreground">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

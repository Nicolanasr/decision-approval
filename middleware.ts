import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const bypassPaths = [
    "/sign-in",
    "/sign-up",
    "/onboarding",
    "/settings/profile",
    "/invites",
  ];

  if (
    user &&
    !bypassPaths.some((path) => pathname.startsWith(path)) &&
    !pathname.startsWith("/api")
  ) {
    const workspaceId = request.cookies.get("workspace_id")?.value ?? "";
    let membership = null;

    if (workspaceId) {
      const { data } = await supabase
        .from("workspace_members")
        .select("member_name,member_title")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .maybeSingle();
      membership = data;
    } else {
      const { data } = await supabase
        .from("workspace_members")
        .select("member_name,member_title")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      membership = data;
    }

    if (membership) {
      const needsProfile =
        !membership.member_name || !membership.member_title;
      if (needsProfile) {
        const url = request.nextUrl.clone();
        url.pathname = "/settings/profile";
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "";
  const protocol = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const isLocalhost =
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("0.0.0.0");
  const isInsecure = protocol === "http" || isLocalhost;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const nextOptions = isInsecure
              ? {
                  ...options,
                  secure: false,
                  sameSite: options.sameSite === "none" ? "lax" : options.sameSite,
                }
              : options;
            response.cookies.set({ name, value, ...nextOptions });
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const bypassPaths = [
    "/app/sign-in",
    "/app/sign-up",
    "/app/onboarding",
    "/app/settings/profile",
    "/app/invites",
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
        url.pathname = "/app/settings/profile";
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

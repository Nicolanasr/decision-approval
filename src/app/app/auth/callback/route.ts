import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const type = requestUrl.searchParams.get("type");

  if (!code) {
    const url = new URL("/app/sign-in", request.url);
    url.searchParams.set("error", "Missing authentication code.");
    return NextResponse.redirect(url);
  }

  const targetPath = type === "recovery" ? "/app/reset-password" : "/app";
  const response = NextResponse.redirect(new URL(targetPath, request.url));
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "";
  const protocol =
    request.headers.get("x-forwarded-proto") ?? requestUrl.protocol.replace(":", "");
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

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const url = new URL("/app/sign-in", request.url);
    url.searchParams.set("error", error.message);
    return NextResponse.redirect(url);
  }

  return response;
}

import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";
  const protocol = headerStore.get("x-forwarded-proto") ?? "";
  const isLocalhost =
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("0.0.0.0");
  const isInsecure = protocol === "http" || isLocalhost;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
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
            cookieStore.set({ name, value, ...nextOptions });
          });
        },
      },
    }
  );
}

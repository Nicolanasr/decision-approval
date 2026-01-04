"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const hiddenPrefixes = ["/app/sign-in", "/app/sign-up"];

type AppHeaderProps = {
    role?: string | null;
};

export function AppHeader({ role }: AppHeaderProps) {
    const pathname = usePathname();

    if (
        pathname === "/" ||
        hiddenPrefixes.some((prefix) => pathname.startsWith(prefix)) ||
        pathname.includes("/print")
    ) {
        return null;
    }

    return (
        <header className="border-b border-neutral-200 bg-white sticky top-0 left-0 right-0">
            <div className="mx-auto flex w-full max-w-[720px] items-center justify-between px-6 py-4">
                <Link href="/app" className="text-sm font-semibold text-neutral-900">
                    Decidex
                </Link>
                <nav className="flex items-center gap-4 text-sm text-neutral-500">
                    <Link href="/app/settings/workspaces" className="hover:text-neutral-900">
                        Workspaces
                    </Link>
                    {role === "admin" || role === "auditor" ? (
                        <Link href="/app/settings/members" className="hover:text-neutral-900">
                            Members
                        </Link>
                    ) : null}
                    <Link href="/app/settings/profile" className="hover:text-neutral-900">
                        Profile
                    </Link>
                    <form action="/app/logout" method="post">
                        <button type="submit" className="hover:text-neutral-900">
                            Log out
                        </button>
                    </form>
                </nav>
            </div>
        </header>
    );
}

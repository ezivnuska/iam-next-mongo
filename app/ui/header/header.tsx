// app/ui/header.tsx

"use client";

import Link from "next/link";
import NavLinks from "@/app/ui/header/nav-links";
import AuthLinks from "./auth-links";
import { useUser } from "@/app/lib/providers/user-provider";

export default function Header() {
    const { status } = useUser();
    const showNavLinks = status === "authenticated";

    return (
        <div className="flex flex-row items-center gap-2 px-4 min-[375px]:px-2 min-[375px]:px-1">
            <Link href="/" className="px-2">
                <h1 className="text-[32px] font-bold">iameric</h1>
            </Link>
            <div className="flex w-full items-center justify-between">
                {showNavLinks && <NavLinks />}
                <AuthLinks />
            </div>
        </div>
    );
}

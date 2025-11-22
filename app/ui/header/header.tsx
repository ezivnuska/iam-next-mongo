// app/ui/header.tsx

"use client";

import Link from "next/link";
import NavLinks from "@/app/ui/header/nav-links";
import AuthLinks from "./auth-links";

export default function Header() {

    return (
        <div className="flex flex-row items-center gap-2 px-2 py-1 min-[375px]:px-2">
            <Link href="/">
                <h1 className="text-[32px] font-bold">iameric</h1>
            </Link>
            <div className="flex w-full items-center justify-between">
                <NavLinks />
                <AuthLinks />
            </div>
        </div>
    );
}

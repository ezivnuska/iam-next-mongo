// app/ui/header.tsx

"use client";

import Link from "next/link";
import Nav from "./nav";

export default function Header() {

    return (
        <div className="flex flex-row items-center gap-2 px-2 py-1">
            <Link href="/">
                <h1 className="text-[32px] min-[375px]:text-[24px] font-bold">iameric</h1>
            </Link>
            <Nav />
        </div>
    );
}

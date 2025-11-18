// app/ui/soft-header.tsx

"use client";

import Link from "next/link";
import NavLinks from "@/app/ui/header/nav-links";
import AuthLinks from "./auth-links";
import { ArrowLeftIcon } from "@heroicons/react/20/solid";
import { Button } from "@/app/ui/button";
import { useUser } from "@/app/lib/providers/user-provider";

type SoftHeaderProps = {
    color: string;
}

export default function SoftHeader({ color = 'white' }: SoftHeaderProps) {
    const { status } = useUser();
    const showNavLinks = status === "authenticated";

    return (
        <div className={`flex flex-row items-center gap-2 px-2 h-[60px]`}>
            {/* <div className="flex"> */}
            <Link href='/'>
                <ArrowLeftIcon className={`h-6 w-6 text-${color}`} />
            </Link>
            {/* </div> */}
            {/* <Link href='/'>
                <h1 className={`text-[32px] font-bold text-${color}`}>iameric</h1>
            </Link> */}
        </div>
    );
}

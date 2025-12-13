// app/ui/header/brand.tsx

"use client";

import Link from "next/link";

export default function Brand() {

    return (
        <Link href="/" className="flex flex-row items-center">
            <h1 className="text-[24px] sm:text-[32px] font-bold text-white">iameric</h1>
        </Link>
    );
}

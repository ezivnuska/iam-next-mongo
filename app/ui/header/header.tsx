// app/ui/header.tsx

"use client";

import Nav from "./nav";
import Brand from "./brand";

export default function Header() {

    return (
        <div className="flex flex-row items-center justify-center">
            <div className="flex flex-row w-full min-w-[375px] max-w-[600px] items-stretch gap-2 px-2 py-1">
                <Brand />
                <Nav />
            </div>
        </div>
    );
}

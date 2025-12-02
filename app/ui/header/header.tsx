// app/ui/header.tsx

"use client";

import Nav from "./nav";
import Brand from "./brand";

export default function Header() {

    return (
        <div className="flex flex-row items-stretch gap-2 px-2 py-1">
            <Brand />
            <Nav />
        </div>
    );
}

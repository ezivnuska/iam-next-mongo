// app/ui/header.tsx

"use client";

import Nav from "./nav";
import Brand from "./brand";

export default function Header() {

    return (
        <div className="flex flex-row w-full items-center justify-center max-w-[600px]">
            <div className="flex flex-row w-full min-w-[375px] items-stretch gap-2 px-2 py-1">
                <Brand />
                {/* <div className='flex flex-1 flex-row items-center border'> */}
                    <Nav />
                {/* </div> */}
            </div>
        </div>
    );
}

// app/ui/header.tsx

"use client";

// import SideNav from '@/app/ui/sidenav';
import Link from 'next/link';
import NavLinks from '@/app/ui/nav-links';
import { ArrowRightIcon, PowerIcon } from '@heroicons/react/24/outline';
import { useSession } from "next-auth/react";
import { signOutUser } from "@/app/lib/actions/signout";

export default function Header() {
  const { data: session } = useSession();

  return (
      <div className="flex flex-row items-center gap-2">
        <Link href='/' className="px-2">
            <h1 className="text-[32px] font-bold">iameric</h1>
        </Link>
        <div className="flex w-full items-center justify-between">
            <NavLinks />
            <div className="flex items-center">
                {session ? (
                    <form action={signOutUser}>
                        <button className="flex items-center gap-2 self-start rounded-lg bg-blue-500 px-3 py-2 m-1 text-sm text-nowrap font-medium text-white transition-colors hover:bg-blue-400 md:text-base">
                            <PowerIcon className="w-5" /> Sign Out
                        </button>
                    </form>
                ) : (
                    <Link href="/login" className="flex items-center gap-2 self-start rounded-lg bg-blue-500 px-3 py-2 m-1 text-sm text-nowrap font-medium text-white transition-colors hover:bg-blue-400 md:text-base">
                        Sign In <ArrowRightIcon className="w-5" />
                    </Link>
                )}
            </div>
        </div>
    </div>
  );
}

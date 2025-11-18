// app/ui/auth-links.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/app/lib/providers/user-provider";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

export default function AuthLinks() {
  const { status } = useUser();
  const pathname = usePathname();

  const hideAuthLinks = pathname === "/signin" || pathname === "/signup";

  if (hideAuthLinks) return null;

  return (
    <div className="flex w-full justify-end items-center gap-2">
      {status === "authenticated" ? null : status === "loading" ? null : (
        <>
          <Link
            href="/signin"
            className="flex items-center gap-2 self-start rounded-lg bg-blue-500 px-3 py-2 m-1 text-sm font-medium text-white transition-colors hover:bg-blue-400 md:text-base"
          >
            Sign In <ArrowRightIcon className="w-5" />
          </Link>
          <Link
            href="/signup"
            className="flex items-center gap-2 self-start rounded-lg bg-green-500 px-3 py-2 m-1 text-sm font-medium text-white transition-colors hover:bg-green-400 md:text-base"
          >
            Sign Up <ArrowRightIcon className="w-5" />
          </Link>
        </>
      )}
    </div>
  );
}

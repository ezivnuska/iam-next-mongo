// app/ui/auth-links.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutUser } from "@/app/lib/actions/signout";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowRightIcon, PowerIcon } from "@heroicons/react/24/outline";

export default function AuthLinks() {
  const { status } = useSession();
  const pathname = usePathname();
  const [isSigningOut, setIsSigningOut] = useState(false);

  // hide auth links on /signin or /signup
  const hideAuthLinks = pathname === "/signin" || pathname === "/signup";

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOutUser();
    } finally {
      setIsSigningOut(false);
    }
  };

  if (hideAuthLinks) return null;

  return (
    <div className="flex w-full justify-end items-center gap-2">
      {status === "authenticated" ? (
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className={`flex items-center gap-2 self-start rounded-lg px-3 py-2 m-1 text-sm text-nowrap font-medium text-white transition-colors md:text-base ${
            isSigningOut
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-400"
          }`}
        >
          <PowerIcon className="w-5" />
          {isSigningOut ? "Signing Out..." : "Sign Out"}
        </button>
      ) : status === "loading" ? null : (
        <>
          <Link
            href="/signin"
            className="flex items-center gap-2 self-start rounded-lg bg-blue-500 px-3 py-2 m-1 text-sm text-nowrap font-medium text-white transition-colors hover:bg-blue-400 md:text-base"
          >
            Sign In <ArrowRightIcon className="w-5" />
          </Link>
          <Link
            href="/signup"
            className="flex items-center gap-2 self-start rounded-lg bg-green-500 px-3 py-2 m-1 text-sm text-nowrap font-medium text-white transition-colors hover:bg-green-400 md:text-base"
          >
            Sign Up <ArrowRightIcon className="w-5" />
          </Link>
        </>
      )}
    </div>
  );
}

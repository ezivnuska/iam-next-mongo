// app/ui/header.tsx

"use client";

import Link from "next/link";
import NavLinks from "@/app/ui/nav-links";
import { ArrowRightIcon, PowerIcon } from "@heroicons/react/24/outline";
import { useSession } from "next-auth/react";
import { signOutUser } from "@/app/lib/actions/signout";
import { useState } from "react";

export default function Header() {
  const { data: session, status } = useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOutUser();
    } finally {
      setIsSigningOut(false);
    }
  };

  // Only render NavLinks when session status is known
  const showNavLinks = status === "authenticated";

  return (
    <div className="flex flex-row items-center gap-2">
      <Link href="/" className="px-2">
        <h1 className="text-[32px] font-bold">iameric</h1>
      </Link>
      <div className="flex w-full items-center justify-between">
        {showNavLinks && <NavLinks />}
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
                href="/login"
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
      </div>
    </div>
  );
}

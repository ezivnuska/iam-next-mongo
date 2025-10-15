// app/ui/auth-links.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useUser } from "@/app/lib/providers/user-provider";
import { ArrowRightIcon, PowerIcon } from "@heroicons/react/24/outline";

export default function AuthLinks() {
  const { status, user, signOut } = useUser();
  const pathname = usePathname();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const hideAuthLinks = pathname === "/signin" || pathname === "/signup";

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut(); // UserProvider handles clearing state + next-auth
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
          className={`flex items-center gap-2 self-start cursor-pointer rounded-lg px-3 py-2 m-1 text-sm font-medium text-white transition-colors md:text-base ${
            isSigningOut
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-400"
          }`}
        >
          <PowerIcon className="w-5" />
          <p className="hidden min-[376px]:block">
            {isSigningOut ? "Signing Out..." : "Sign Out"}
          </p>
        </button>
      ) : status === "loading" ? null : (
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

// app/ui/header.tsx

"use client";

import Link from "next/link";
import NavLinks from "@/app/ui/nav-links";
import { useSession } from "next-auth/react";
import AuthLinks from "./auth-links";

export default function Header() {
  const { status } = useSession();
  const showNavLinks = status === "authenticated";

  return (
    <div className="flex flex-row items-center gap-2">
      <Link href="/" className="px-2">
        <h1 className="text-[32px] font-bold">iameric</h1>
      </Link>
      <div className="flex w-full items-center justify-between">
        {showNavLinks && <NavLinks />}
        <AuthLinks />
      </div>
    </div>
  );
}

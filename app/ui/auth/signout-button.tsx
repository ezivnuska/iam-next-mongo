// app/ui/auth/signout-button.tsx

"use client";

import { useUser } from "@/app/lib/providers/user-provider";

export default function SignOutButton() {
    const { status, signOut } = useUser();
    const isSigningOut = status === 'signing-out';

    return (
        <button
            onClick={() => signOut()}
            disabled={isSigningOut}
            className='py-1.5 text-base font-medium rounded-full text-blue-600 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default whitespace-nowrap'
        >
            Sign Out
        </button>
    );
}

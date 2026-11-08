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
            aria-label='Sign out'
            className='p-1.5 rounded-full text-blue-600 hover:bg-red-100 hover:text-red-600 active:bg-red-200 active:text-red-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default'
        >
            <svg xmlns='http://www.w3.org/2000/svg' className='w-5 h-5 translate-y-0.5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <path d='M18.364 5.636a9 9 0 1 1-12.728 0' />
                <line x1='12' y1='2' x2='12' y2='12' />
            </svg>
        </button>
    );
}

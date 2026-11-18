// app/ui/auth/signout-button.tsx

"use client";

import { useState } from "react";
import { useUser } from "@/app/lib/providers/user-provider";

export default function SignOutButton({ variant = 'icon' }: { variant?: 'icon' | 'labeled' }) {
    const { status, signOut } = useUser();
    const [confirming, setConfirming] = useState(false);
    const isSigningOut = status === 'signing-out';

    if (variant === 'labeled') {
        if (confirming) {
            return (
                <div className='flex items-center gap-2'>
                    <button
                        onClick={signOut}
                        disabled={isSigningOut}
                        className='px-4 py-2 text-sm font-semibold rounded-lg border border-red-400 text-red-400 hover:bg-red-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default'
                    >
                        {isSigningOut ? 'Signing out…' : 'Sign out'}
                    </button>
                    <button
                        onClick={() => setConfirming(false)}
                        disabled={isSigningOut}
                        className='px-4 py-2 text-sm font-semibold rounded-lg border border-white/50 text-white hover:border-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default'
                    >
                        Cancel
                    </button>
                </div>
            );
        }
        return (
            <button
                onClick={() => setConfirming(true)}
                disabled={isSigningOut}
                className='self-start px-4 py-2 text-sm font-semibold rounded-lg border border-white/50 text-white hover:border-red-400 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default'
            >
                Sign out
            </button>
        );
    }

    return (
        <button
            onClick={signOut}
            disabled={isSigningOut}
            aria-label='Sign out'
            className='flex items-center justify-center text-gray-700 hover:text-red-600 active:text-red-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default'
        >
            <svg xmlns='http://www.w3.org/2000/svg' className='w-7 h-7' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <path d='M18.364 5.636a9 9 0 1 1-12.728 0' />
                <line x1='12' y1='2' x2='12' y2='12' />
            </svg>
        </button>
    );
}

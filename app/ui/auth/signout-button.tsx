// app/ui/auth/signout-button.tsx

"use client";

import { useState } from "react";
import { Modal } from "@iam/ui";
import { useUser } from "@/app/lib/providers/user-provider";

export default function SignOutButton() {
    const { status, signOut } = useUser();
    const [showConfirm, setShowConfirm] = useState(false);
    const isSigningOut = status === 'signing-out';

    return (
        <>
            <button
                onClick={() => setShowConfirm(true)}
                disabled={isSigningOut}
                aria-label='Sign out'
                className='flex items-center justify-center text-gray-700 hover:text-red-600 active:text-red-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default'
            >
                <svg xmlns='http://www.w3.org/2000/svg' className='w-7 h-7' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                    <path d='M18.364 5.636a9 9 0 1 1-12.728 0' />
                    <line x1='12' y1='2' x2='12' y2='12' />
                </svg>
            </button>

            <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)}>
                <div className='flex flex-col gap-4 p-2'>
                    <p className='text-base font-medium text-gray-800'>Sign out?</p>
                    <div className='flex gap-3 justify-end'>
                        <button
                            onClick={() => setShowConfirm(false)}
                            className='px-4 py-1.5 text-sm font-medium rounded-full text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer'
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => { setShowConfirm(false); signOut(); }}
                            disabled={isSigningOut}
                            className='px-4 py-1.5 text-sm font-medium rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default'
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

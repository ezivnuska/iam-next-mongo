'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Brand, useHorizontalLayout } from '@iam/ui';
import SignupForm from '@/app/ui/auth/signup-form';

type Phase = 'idle' | 'fading' | 'open';

interface SignupWelcomeScreenProps {
    inviteError?: string;
}

export default function SignupWelcomeScreen({ inviteError }: SignupWelcomeScreenProps) {
    const [phase, setPhase] = useState<Phase>('idle');
    const [buttonMounted, setButtonMounted] = useState(true);
    const isLandscape = useHorizontalLayout() === true;

    function handleSignUp() {
        setPhase('fading');
        setTimeout(() => {
            setPhase('open');
            setButtonMounted(false);
        }, 150);
    }

    function handleCancel() {
        setButtonMounted(true);
        setPhase('idle');
    }

    const paddingTop = phase === 'idle'
        ? 'calc(50dvh - 6.25rem)'
        : (isLandscape ? '10dvh' : '20dvh');

    if (inviteError) {
        return (
            <div className='flex flex-1 flex-col items-center justify-center bg-black px-6'>
                <Brand />
                <div className='mt-10 w-full max-w-sm'>
                    <p className='text-sm text-red-400'>{inviteError}</p>
                    <Link
                        href='/signin'
                        className='mt-3 inline-block text-sm text-white/50 hover:text-white/80 transition-colors'
                    >
                        Return to sign in
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div
            className='flex flex-1 flex-col items-center bg-black overflow-y-auto'
            style={{
                paddingTop,
                transition: 'padding-top 500ms ease-in-out',
            }}
        >
            <Brand />

            {buttonMounted && (
                <div
                    className='mt-10'
                    style={{
                        opacity: phase === 'idle' ? 1 : 0,
                        pointerEvents: phase !== 'idle' ? 'none' : 'auto',
                        transition: 'opacity 150ms',
                    }}
                >
                    <button
                        onClick={handleSignUp}
                        className='px-8 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors cursor-pointer'
                    >
                        Sign Up
                    </button>
                </div>
            )}

            {phase !== 'idle' && (
                <div
                    className='mt-10 w-full max-w-sm px-6 pb-8'
                    style={{
                        opacity: phase === 'open' ? 1 : 0,
                        transform: phase === 'open' ? 'translateY(0)' : 'translateY(8px)',
                        transition: 'opacity 400ms 100ms, transform 400ms 100ms',
                    }}
                >
                    <SignupForm dark />
                    <button
                        type='button'
                        onClick={handleCancel}
                        className='mt-3 w-full text-sm text-white/40 hover:text-white/70 transition-colors cursor-pointer'
                    >
                        Cancel
                    </button>
                </div>
            )}
        </div>
    );
}

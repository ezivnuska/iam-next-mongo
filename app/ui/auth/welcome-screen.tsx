'use client';

import { useState } from 'react';
import { Brand, useHorizontalLayout } from '@iam/ui';
import SigninForm from '@/app/ui/auth/signin-form';

type Phase = 'idle' | 'fading' | 'open';

export default function WelcomeScreen() {
    const [phase, setPhase] = useState<Phase>('idle');
    const [buttonMounted, setButtonMounted] = useState(true);
    const isLandscape = useHorizontalLayout() === true;

    function handleSignIn() {
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

    // Start animating paddingTop as soon as button fades (not waiting for 'open')
    // Idle: positions brand above center so button lands near vertical center
    const paddingTop = phase === 'idle'
        ? 'calc(50dvh - 6.25rem)'
        : (isLandscape ? '10dvh' : '20dvh');

    return (
        <div
            className='flex flex-1 flex-col items-center bg-black overflow-y-auto'
            style={{
                paddingTop,
                transition: 'padding-top 500ms ease-in-out',
            }}
        >
            <Brand />

            {/* Sign-in button — fades out then unmounts, doesn't affect form layout */}
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
                        onClick={handleSignIn}
                        className='px-8 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors cursor-pointer'
                    >
                        Sign In
                    </button>
                </div>
            )}

            {/* Form — mounts during fading (invisible) so transition is ready when open fires */}
            {phase !== 'idle' && (
                <div
                    className='mt-10 w-full max-w-sm px-6 pb-8'
                    style={{
                        opacity: phase === 'open' ? 1 : 0,
                        transform: phase === 'open' ? 'translateY(0)' : 'translateY(8px)',
                        transition: 'opacity 400ms 100ms, transform 400ms 100ms',
                    }}
                >
                    <SigninForm dark />
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

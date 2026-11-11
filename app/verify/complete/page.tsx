'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

function AutoLogin() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const attempted = useRef(false);

    useEffect(() => {
        if (attempted.current) return;
        attempted.current = true;

        const token = searchParams.get('token');
        if (!token) { router.replace('/'); return; }

        signIn('credentials', { autoLoginToken: token, redirect: false }).then(result => {
            if (result?.ok) router.replace('/');
            else router.replace('/signin');
        });
    }, [searchParams, router]);

    return null;
}

export default function VerifyCompletePage() {
    return (
        <Suspense>
            <AutoLogin />
        </Suspense>
    );
}

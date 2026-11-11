'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { authenticateWithToken } from '@/app/lib/actions/authenticate';

function AutoLogin() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const attempted = useRef(false);

    useEffect(() => {
        if (attempted.current) return;
        attempted.current = true;

        const token = searchParams.get('token');
        if (!token) { router.replace('/signin'); return; }

        authenticateWithToken(token).catch(() => router.replace('/signin'));
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

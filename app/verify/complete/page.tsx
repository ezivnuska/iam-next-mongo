'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { authenticateWithToken } from '@/app/lib/actions/authenticate';

function AutoLogin() {
    const searchParams = useSearchParams();
    const formRef = useRef<HTMLFormElement>(null);
    const token = searchParams.get('token') || '';

    useEffect(() => {
        if (token && formRef.current) {
            formRef.current.requestSubmit();
        } else if (!token) {
            window.location.href = '/signin';
        }
    }, [token]);

    return (
        <form ref={formRef} action={authenticateWithToken}>
            <input type="hidden" name="autoLoginToken" value={token} />
        </form>
    );
}

export default function VerifyCompletePage() {
    return (
        <Suspense>
            <AutoLogin />
        </Suspense>
    );
}

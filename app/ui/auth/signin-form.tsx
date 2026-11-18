// app/ui/auth/signin-form.tsx

'use client';

import { ubuntu } from '@iam/ui';
import { AtSymbolIcon, KeyIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { Button } from '@iam/ui';
import { useActionState, useState, useRef } from 'react';
import { authenticate } from '@/app/lib/actions/authenticate';
import { useSearchParams } from 'next/navigation';

interface SigninFormProps {
  callbackUrl?: string;
  dark?: boolean;
}

export default function SigninForm({ callbackUrl: propCallbackUrl, dark = false }: SigninFormProps = {}) {
  const searchParams = useSearchParams();
  const callbackUrl = propCallbackUrl || searchParams.get('callbackUrl') || '/';
  const emailRef = useRef<HTMLInputElement>(null);
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  const [errorMessage, formAction, isPending] = useActionState<
    string | undefined,
    FormData
  >(
    async (_prevState, formData) => {
      setResendStatus('idle');
      return await authenticate(formData);
    },
    undefined
  );

  const isVerifyError = !!errorMessage?.startsWith('verify:');
  const displayError = isVerifyError ? errorMessage!.slice(7) : errorMessage;

  async function handleResend() {
    const email = emailRef.current?.value;
    if (!email) return;
    setResendStatus('sending');
    try {
      const res = await fetch('/api/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setResendStatus(res.ok ? 'sent' : 'idle');
    } catch {
      setResendStatus('idle');
    }
  }

  const labelClass = dark
    ? 'mb-2 mt-3 block text-s font-medium text-white'
    : 'mb-2 mt-3 block text-s font-medium text-gray-900';

  const inputClass = dark
    ? 'peer block w-full rounded-md border border-white/40 bg-transparent text-white py-[9px] pl-10 text-sm outline-2 placeholder:text-white/40'
    : 'peer block w-full rounded-md border border-gray-200 bg-white text-gray-900 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500';

  const iconClass = dark
    ? 'pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/40 peer-focus:text-white'
    : 'pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900';

  return (
    <form action={formAction} className='space-y-3'>
      <div className={dark ? 'flex-1' : 'flex-1 rounded-lg bg-gray-50 px-4 py-2'}>
        <h1 className={`${ubuntu.className} mb-1 text-2xl ${dark ? 'text-white' : 'text-gray-900'}`}>
          Please log in to continue.
        </h1>

        <div className='w-full'>
          <label className={labelClass} htmlFor='email'>
            Email
          </label>
          <div className='relative'>
            <input
              ref={emailRef}
              id='email'
              name='email'
              type='email'
              placeholder='Enter your email address'
              required
              className={inputClass}
            />
            <AtSymbolIcon className={iconClass} />
          </div>

          <label className={labelClass} htmlFor='password'>
            Password
          </label>
          <div className='relative'>
            <input
              id='password'
              name='password'
              type='password'
              placeholder='Enter password'
              required
              minLength={6}
              className={inputClass}
            />
            <KeyIcon className={iconClass} />
          </div>
        </div>

        <input type='hidden' name='redirectTo' value={callbackUrl} />

        <Button
          className={dark ? 'mt-4 w-full bg-white text-gray-900 hover:bg-gray-100 active:bg-gray-200' : 'mt-4 w-full'}
          aria-disabled={isPending}
        >
          Sign in
        </Button>

        {displayError && (
          <div className='mt-2 space-y-1'>
            <div className='flex h-8 items-end space-x-1'>
              <ExclamationCircleIcon className='h-5 w-5 text-red-500' />
              <p className='text-sm text-red-500'>{displayError}</p>
            </div>
            {isVerifyError && (
              <div className={`text-xs ${dark ? 'text-white/60' : 'text-gray-500'}`}>
                {resendStatus === 'sent' ? (
                  <span>Verification email sent. Check your inbox.</span>
                ) : (
                  <button
                    type='button'
                    onClick={handleResend}
                    disabled={resendStatus === 'sending'}
                    className={dark ? 'text-blue-300 underline disabled:opacity-50' : 'text-blue-600 underline disabled:opacity-50'}
                  >
                    {resendStatus === 'sending' ? 'Sending...' : 'Resend verification email'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </form>
  );
}

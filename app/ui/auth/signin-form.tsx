// app/ui/auth/signin-form.tsx

'use client';

import { ubuntu } from '@/app/ui/fonts';
import { AtSymbolIcon, KeyIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/app/ui/button';
import { useActionState, useState, useRef } from 'react';
import { authenticate } from '@/app/lib/actions/authenticate';
import { useSearchParams } from 'next/navigation';

interface SigninFormProps {
  onToggleMode?: () => void;
  callbackUrl?: string;
}

export default function SigninForm({ onToggleMode, callbackUrl: propCallbackUrl }: SigninFormProps = {}) {
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
    await fetch('/api/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setResendStatus('sent');
  }

  return (
    <form action={formAction} className='space-y-3'>
      <div className='flex-1 rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-2'>
        <h1 className={`${ubuntu.className} mb-1 text-2xl text-gray-900 dark:text-white`}>
          Please log in to continue.
        </h1>

        <div className='w-full'>
          <label
            className='mb-2 mt-3 block text-s font-medium text-gray-900 dark:text-gray-200'
            htmlFor='email'
          >
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
              className='peer block w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500 dark:placeholder:text-gray-400'
            />
            <AtSymbolIcon className='pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 dark:text-gray-400 peer-focus:text-gray-900 dark:peer-focus:text-white' />
          </div>

          <label
            className='mb-2 mt-3 block text-s font-medium text-gray-900 dark:text-gray-200'
            htmlFor='password'
          >
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
              className='peer block w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500 dark:placeholder:text-gray-400'
            />
            <KeyIcon className='pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 dark:text-gray-400 peer-focus:text-gray-900 dark:peer-focus:text-white' />
          </div>
        </div>

        <input type='hidden' name='redirectTo' value={callbackUrl} />

        <Button className='mt-4 w-full' aria-disabled={isPending}>
          Sign in
        </Button>

        {displayError && (
          <div className='mt-2 space-y-1'>
            <div className='flex h-8 items-end space-x-1'>
              <ExclamationCircleIcon className='h-5 w-5 text-red-500' />
              <p className='text-sm text-red-500'>{displayError}</p>
            </div>
            {isVerifyError && (
              <div className='text-xs text-gray-500 dark:text-gray-400'>
                {resendStatus === 'sent' ? (
                  <span>Verification email sent. Check your inbox.</span>
                ) : (
                  <button
                    type='button'
                    onClick={handleResend}
                    disabled={resendStatus === 'sending'}
                    className='text-blue-600 dark:text-blue-400 underline disabled:opacity-50'
                  >
                    {resendStatus === 'sending' ? 'Sending...' : 'Resend verification email'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {onToggleMode && (
          <div className='mt-4 text-center text-sm text-gray-600 dark:text-gray-400'>
            Don&apos;t have an account?{' '}
            <button
              type='button'
              onClick={onToggleMode}
              className='text-blue-600 dark:text-blue-400 hover:text-blue-500 font-medium underline'
            >
              Sign up
            </button>
          </div>
        )}
      </div>
    </form>
  );
}

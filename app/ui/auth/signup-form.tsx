// app/ui/signup-form.tsx

'use client';

import { ubuntu } from '@iam/ui';
import { AtSymbolIcon, KeyIcon, ExclamationCircleIcon, UserIcon } from '@heroicons/react/24/outline';
import { Button } from '@iam/ui';
import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { register, type RegisterResult } from '@/app/lib/actions/register';
import { useState, useEffect } from 'react';

interface SignupFormProps {
  onToggleMode?: () => void;
  callbackUrl?: string;
}

export default function SignupForm({ onToggleMode, callbackUrl: propCallbackUrl }: SignupFormProps = {}) {
  const searchParams = useSearchParams();
  const callbackUrl = propCallbackUrl || searchParams.get('callbackUrl') || '/';
  const inviteToken = searchParams.get('invite') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>();

  const [state, formAction, isPending] = useActionState<RegisterResult, FormData>(
    async (_prevState, formData) => {
      if (password !== confirmPassword) {
        return { error: 'Passwords do not match' };
      }
      return await register(formData);
    },
    undefined
  );

  useEffect(() => {
    if (confirmPassword && password !== confirmPassword) {
      setPasswordError('Passwords do not match');
    } else {
      setPasswordError(undefined);
    }
  }, [password, confirmPassword]);

  if (state && 'success' in state) {
    return (
      <div className='flex-1 rounded-lg bg-gray-50 px-4 py-6'>
        <h1 className={`${ubuntu.className} mb-3 text-2xl text-gray-900`}>
          Check your email
        </h1>
        <p className='text-sm text-gray-700'>
          We sent a verification link to your email address. Click the link to activate your account, then sign in.
        </p>
        <p className='mt-3 text-xs text-gray-500'>
          The link expires in 24 hours. Check your spam folder if you don&apos;t see it.
        </p>
        {onToggleMode && (
          <div className='mt-4 text-center text-sm text-gray-600'>
            <button
              type='button'
              onClick={onToggleMode}
              className='text-blue-600 hover:text-blue-500 font-medium underline'
            >
              Back to sign in
            </button>
          </div>
        )}
      </div>
    );
  }

  const errorMessage = state && 'error' in state ? state.error : undefined;

  return (
    <form action={formAction} className='space-y-3'>
      <div className='flex-1 rounded-lg bg-gray-50 px-4 py-2'>
        <h1 className={`${ubuntu.className} mb-1 text-2xl text-gray-900`}>
          Create an account
        </h1>

        <div className='w-full'>
          <label
            className='mb-2 mt-3 block text-s font-medium text-gray-900'
            htmlFor='username'
          >
            Username
          </label>
          <div className='relative'>
            <input
              id='username'
              name='username'
              type='text'
              placeholder='Choose a username'
              required
              minLength={2}
              maxLength={20}
              className='peer block w-full rounded-md border border-gray-200 bg-white text-gray-900 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500'
            />
            <UserIcon className='pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900' />
          </div>

          <label
            className='mb-2 mt-3 block text-s font-medium text-gray-900'
            htmlFor='email'
          >
            Email
          </label>
          <div className='relative'>
            <input
              id='email'
              name='email'
              type='email'
              placeholder='Enter your email address'
              required
              className='peer block w-full rounded-md border border-gray-200 bg-white text-gray-900 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500'
            />
            <AtSymbolIcon className='pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900' />
          </div>

          <label
            className='mb-2 mt-3 block text-s font-medium text-gray-900'
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className='peer block w-full rounded-md border border-gray-200 bg-white text-gray-900 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500'
            />
            <KeyIcon className='pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900' />
          </div>

          <label
            className='mb-2 mt-3 block text-s font-medium text-gray-900'
            htmlFor='confirmPassword'
          >
            Confirm Password
          </label>
          <div className='relative'>
            <input
              id='confirmPassword'
              name='confirmPassword'
              type='password'
              placeholder='Confirm password'
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className='peer block w-full rounded-md border border-gray-200 bg-white text-gray-900 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500'
            />
            <KeyIcon className='pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900' />
          </div>

          {passwordError && (
            <div className='flex h-8 items-end space-x-1 mt-1'>
              <ExclamationCircleIcon className='h-5 w-5 text-red-500' />
              <p className='text-sm text-red-500'>{passwordError}</p>
            </div>
          )}
        </div>

        <input type='hidden' name='redirectTo' value={callbackUrl} />
        {inviteToken && <input type='hidden' name='inviteToken' value={inviteToken} />}

        <Button
          className='mt-4 w-full'
          aria-disabled={isPending || !!passwordError}
        >
          Sign up
        </Button>

        {errorMessage && (
          <div className='flex h-8 items-end space-x-1 mt-2'>
            <ExclamationCircleIcon className='h-5 w-5 text-red-500' />
            <p className='text-sm text-red-500'>{errorMessage}</p>
          </div>
        )}

        {onToggleMode && (
          <div className='mt-4 text-center text-sm text-gray-600'>
            Already have an account?{' '}
            <button
              type='button'
              onClick={onToggleMode}
              className='text-blue-600 hover:text-blue-500 font-medium underline'
            >
              Sign in
            </button>
          </div>
        )}
      </div>
    </form>
  );
}

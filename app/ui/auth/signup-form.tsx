// app/ui/signup-form.tsx

'use client';

import { ubuntu } from '@/app/ui/fonts';
import { AtSymbolIcon, KeyIcon, ExclamationCircleIcon, UserIcon } from '@heroicons/react/24/outline';
import { Button } from '@/app/ui/button';
import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { register } from '@/app/lib/actions/register';
import { useState, useEffect } from 'react';

interface SignupFormProps {
  onToggleMode?: () => void;
  callbackUrl?: string;
}

export default function SignupForm({ onToggleMode, callbackUrl: propCallbackUrl }: SignupFormProps = {}) {
  const searchParams = useSearchParams();
  const callbackUrl = propCallbackUrl || searchParams.get('callbackUrl') || '/';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>();

  const [errorMessage, formAction, isPending] = useActionState<
    string | undefined,
    FormData
  >(
    async (_prevState, formData) => {
      if (password !== confirmPassword) {
        return 'Passwords do not match';
      }

      return await register(formData);
    },
    undefined
  );

  // Live password match check
  useEffect(() => {
    if (confirmPassword && password !== confirmPassword) {
      setPasswordError('Passwords do not match');
    } else {
      setPasswordError(undefined);
    }
  }, [password, confirmPassword]);

  return (
    <form action={formAction} className='space-y-3'>
      <div className='flex-1 rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-2'>
        <h1 className={`${ubuntu.className} mb-1 text-2xl text-gray-900 dark:text-white`}>
          Create an account
        </h1>

        <div className='w-full'>
          <label
            className='mb-2 mt-3 block text-s font-medium text-gray-900 dark:text-gray-200'
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
              className='peer block w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500 dark:placeholder:text-gray-400'
            />
            <UserIcon className='pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 dark:text-gray-400 peer-focus:text-gray-900 dark:peer-focus:text-white' />
          </div>

          <label
            className='mb-2 mt-3 block text-s font-medium text-gray-900 dark:text-gray-200'
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className='peer block w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500 dark:placeholder:text-gray-400'
            />
            <KeyIcon className='pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 dark:text-gray-400 peer-focus:text-gray-900 dark:peer-focus:text-white' />
          </div>

          <label
            className='mb-2 mt-3 block text-s font-medium text-gray-900 dark:text-gray-200'
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
              className='peer block w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500 dark:placeholder:text-gray-400'
            />
            <KeyIcon className='pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 dark:text-gray-400 peer-focus:text-gray-900 dark:peer-focus:text-white' />
          </div>

          {/* Live password mismatch error */}
          {passwordError && (
            <div className='flex h-8 items-end space-x-1 mt-1'>
              <ExclamationCircleIcon className='h-5 w-5 text-red-500' />
              <p className='text-sm text-red-500'>{passwordError}</p>
            </div>
          )}
        </div>

        <input type='hidden' name='redirectTo' value={callbackUrl} />

        <Button
          className='mt-4 w-full'
          aria-disabled={isPending || !!passwordError}
        >
          Sign up
        </Button>

        {/* Server-side error */}
        {errorMessage && (
          <div className='flex h-8 items-end space-x-1 mt-2'>
            <ExclamationCircleIcon className='h-5 w-5 text-red-500' />
            <p className='text-sm text-red-500'>{errorMessage}</p>
          </div>
        )}

        {onToggleMode && (
          <div className='mt-4 text-center text-sm text-gray-600 dark:text-gray-400'>
            Already have an account?{' '}
            <button
              type='button'
              onClick={onToggleMode}
              className='text-blue-600 dark:text-blue-400 hover:text-blue-500 font-medium underline'
            >
              Sign in
            </button>
          </div>
        )}
      </div>
    </form>
  );
}

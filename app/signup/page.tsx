import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/app/lib/auth';
import { connectToDatabase } from '@/app/lib/mongoose';
import Invitation from '@/app/lib/models/invitation';
import UserModel from '@/app/lib/models/user';
import AuthPanel from '@/app/signin/AuthPanel';

export const metadata = { title: 'Sign Up' };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ invite?: string; email?: string }> }) {
  const session = await auth();
  if (session?.user?.id) redirect('/');

  const { invite: inviteToken, email: emailParam } = await searchParams;

  if (!inviteToken) redirect('/signin');

  let inviteError: string | null = null;
  let invitation: { inviterId: { toString(): string }; inviteeEmail: string } | null = null;

  await connectToDatabase();
  invitation = await Invitation.findOne({ token: inviteToken, used: false }).lean<{ inviterId: { toString(): string }; inviteeEmail: string }>();
  if (!invitation) {
    inviteError = 'This invitation link is invalid or has already been used.';
  } else {
    const inviter = await UserModel.findById(invitation.inviterId).select('_id').lean();
    if (!inviter) {
      inviteError = 'The person who invited you no longer has an account.';
    } else if (emailParam && invitation.inviteeEmail !== emailParam.toLowerCase()) {
      inviteError = 'This invitation was sent to a different email address.';
    }
  }

  return (
    <main className='flex items-center justify-center wide:h-screen'>
      <div className='relative mx-auto flex w-full max-w-[400px] flex-col space-y-2.5 p-4 wide:-mt-32'>
        <div className='flex h-20 w-full items-end rounded-lg bg-blue-500 p-3 wide:h-36'>
          <div className='w-32 text-white wide:w-36'>
            <h1 className='text-[32px] font-bold'>iameric</h1>
          </div>
        </div>
        {inviteError ? (
          <div className='rounded-lg bg-gray-50 px-4 py-6'>
            <p className='text-sm text-red-600'>{inviteError}</p>
            <Link href='/signin' className='mt-3 inline-block text-sm text-blue-600 underline'>
              Return to sign in
            </Link>
          </div>
        ) : (
          <Suspense>
            <AuthPanel initialMode='signup' />
          </Suspense>
        )}
      </div>
    </main>
  );
}

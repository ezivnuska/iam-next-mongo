import { redirect } from 'next/navigation';
import { auth } from '@/app/lib/auth';
import { connectToDatabase } from '@/app/lib/mongoose';
import Invitation from '@/app/lib/models/invitation';
import UserModel from '@/app/lib/models/user';
import SignupWelcomeScreen from '@/app/ui/auth/signup-welcome-screen';

export const metadata = { title: 'Sign Up' };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ invite?: string; email?: string }> }) {
    const session = await auth();
    if (session?.user?.id) redirect('/');

    const { invite: inviteToken, email: emailParam } = await searchParams;

    if (!inviteToken) redirect('/signin');

    let inviteError: string | undefined;

    await connectToDatabase();
    const invitation = await Invitation.findOne({ token: inviteToken, used: false }).lean<{ inviterId: { toString(): string }; inviteeEmail: string }>();

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

    return <SignupWelcomeScreen inviteError={inviteError} />;
}

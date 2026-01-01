// app/profile/page.tsx

export const dynamic = 'force-dynamic';

import { auth } from '@/app/lib/auth';
import { redirect } from 'next/navigation';

export default async function ProfileRedirect() {
    const session = await auth();

    if (!session?.user?.username) {
        redirect('/?auth=required&callbackUrl=/profile');
    }

    // Redirect to the user's profile page
    redirect(`/users/${session.user.username}`);
}

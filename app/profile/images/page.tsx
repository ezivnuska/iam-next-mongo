// app/profile/images/page.tsx

export const dynamic = 'force-dynamic';

import { auth } from '@/app/lib/auth';
import { redirect } from 'next/navigation';

export default async function ProfileImagesRedirect() {
    const session = await auth();

    if (!session?.user?.username) {
        redirect('/?auth=required&callbackUrl=/profile/images');
    }

    // Redirect to the user's images page
    redirect(`/users/${session.user.username}/images`);
}

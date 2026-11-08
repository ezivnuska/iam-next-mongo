// app/ui/user/user-images-panel.tsx

import { fetchUserByUsername } from '@/app/lib/actions/users';
import ImagesClient from '@/app/ui/images/images-client';

interface UserImagesPanelProps {
    username: string;
    authorized?: boolean;
}

export default async function UserImagesPanel({ username, authorized = false }: UserImagesPanelProps) {
    const user = await fetchUserByUsername(username);
    if (!user) return null;

    return (
        <ImagesClient
            userId={user.id}
            authorized={authorized}
            showUploadButton={authorized}
        />
    );
}

// app/users/[username]/images/page.tsx

import Breadcrumbs from "@/app/ui/layout/breadcrumbs";
import ProtectedRoute from "@/app/ui/auth/protected-route";
import ImagesClient from "@/app/ui/images/images-client";
import Main from "@/app/ui/layout/main";
import { fetchUserByUsername } from "@/app/lib/actions";

interface Props {
    params: Promise<{ username: string }>;
}

export default async function Page({ params }: Props) {
    const { username } = await params
    const user = await fetchUserByUsername(username)
    if (!user) return null
    const { id } = user

    return (
        <ProtectedRoute>
            <Main>
                <Breadcrumbs
                    breadcrumbs={[
                        { label: 'Users', href: `/users` },
                        { label: username, href: `/users/${username}` },
                        { label: "Images", href: `/users/${username}/images`, active: true },
                    ]}
                />
                <ImagesClient userId={id} />
            </Main>
        </ProtectedRoute>
    );
}

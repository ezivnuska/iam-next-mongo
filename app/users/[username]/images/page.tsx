// app/users/[username]/images/page.tsx

import Breadcrumbs from "@/app/ui/layout/breadcrumbs";
import ImagesClient from "@/app/ui/images/images-client";
import { fetchUserByUsername } from "@/app/lib/actions";
import DefaultPage from "@/app/ui/layout/page/default-page";
import { auth } from "@/app/lib/auth";
import { redirect } from "next/navigation";

interface Props {
    params: Promise<{ username: string }>;
}

export default async function Page({ params }: Props) {
    // Server-side authentication check
    const session = await auth();
    const { username } = await params;

    if (!session) {
        redirect(`/?auth=required&callbackUrl=/users/${username}/images`);
    }

    const user = await fetchUserByUsername(username);
    if (!user) return null;
    const { id } = user;

    return (
        <DefaultPage>
            <Breadcrumbs
                breadcrumbs={[
                    { label: 'Users', href: `/users` },
                    { label: username, href: `/users/${username}` },
                    { label: "Images", href: `/users/${username}/images`, active: true },
                ]}
            />
            <ImagesClient userId={id} />
        </DefaultPage>
    );
}

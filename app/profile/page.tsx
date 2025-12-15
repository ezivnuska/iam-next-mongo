// app/profile/page.tsx

export const dynamic = 'force-dynamic';

import Breadcrumbs from "@/app/ui/layout/breadcrumbs";
import { auth } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import UserProfileCard from "@/app/ui/user/user-profile-card";
import UserContentFeed from "@/app/ui/user/user-content-feed";
import { getUserContent } from "@/app/lib/actions/user-content";
import PageContent from "../ui/page-content";

export default async function ProfilePage() {
    const session = await auth();
    if (!session) {
        redirect("/?auth=required&callbackUrl=/profile");
    }

    const content = await getUserContent();

    return (
        <PageContent>
            <Breadcrumbs
                breadcrumbs={[
                    { label: "Profile", href: "/profile", active: true },
                    { label: "Images", href: "/profile/images" },
                ]}
            />
            <UserProfileCard />
            <UserContentFeed initialContent={content} editable />
        </PageContent>
    );
}

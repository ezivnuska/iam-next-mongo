// app/profile/page.tsx

import Breadcrumbs from "@/app/ui/layout/breadcrumbs";
import ProtectedRoute from "@/app/ui/auth/protected-route";
import UserProfileCard from "@/app/ui/user/user-profile-card";
import UserContentFeed from "@/app/ui/user/user-content-feed";
import { getUserContent } from "@/app/lib/actions/user-content";
import DefaultPage from "../ui/layout/page/default-page";

export default async function ProfilePage() {
    const content = await getUserContent();

    return (
        <ProtectedRoute>
            <DefaultPage>
                <Breadcrumbs
                    breadcrumbs={[
                        { label: "Profile", href: "/profile", active: true },
                        { label: "Images", href: "/profile/images" },
                    ]}
                />
                <UserProfileCard />
                <UserContentFeed initialContent={content} editable />
            </DefaultPage>
        </ProtectedRoute>
    );
}

// app/profile/page.tsx

import Breadcrumbs from "@/app/ui/layout/breadcrumbs";
import Main from "@/app/ui/layout/main";
import ProtectedRoute from "@/app/ui/auth/protected-route";
import UserProfileCard from "@/app/ui/user/user-profile-card";

export default function ProfilePage() {

    return (
        <ProtectedRoute>
            <Main>
                <Breadcrumbs
                    breadcrumbs={[
                        { label: "Profile", href: "/profile", active: true },
                        { label: "Images", href: "/profile/images" },
                    ]}
                />
                <UserProfileCard />
            </Main>
        </ProtectedRoute>
    );
}

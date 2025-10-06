// app/profile/page.tsx

import Breadcrumbs from "../ui/breadcrumbs";
import Main from "../ui/main";
import ProtectedRoute from "../ui/protected-route";
import ProfileInfo from "./profile-info";

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
                <ProfileInfo />
            </Main>
        </ProtectedRoute>
    );
}

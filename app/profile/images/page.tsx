// app/profile/images/page.tsx

import Breadcrumbs from "@/app/ui/layout/breadcrumbs";
import ProtectedRoute from "@/app/ui/auth/protected-route";
import ImagesClient from "@/app/ui/images/images-client";

export default async function Page() {

    return (
        <ProtectedRoute>
            <Breadcrumbs
                breadcrumbs={[
                    { label: "Profile", href: "/profile" },
                    { label: "Images", href: "/profile/images", active: true },
                ]}
            />
            <ImagesClient authorized={true} />
        </ProtectedRoute>
    );
}

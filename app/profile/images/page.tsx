// app/profile/images/page.tsx

import Breadcrumbs from "@/app/ui/breadcrumbs";
import ProtectedRoute from "@/app/ui/protected-route";
import ImagesClient from "@/app/ui/images-client";
import Main from "@/app/ui/main";

export default async function Page() {

    return (
        <ProtectedRoute>
            <Main>
                <Breadcrumbs
                    breadcrumbs={[
                        { label: "Profile", href: "/profile" },
                        { label: "Images", href: "/profile/images", active: true },
                    ]}
                />
                <ImagesClient authorized={true} />
            </Main>
        </ProtectedRoute>
    );
}

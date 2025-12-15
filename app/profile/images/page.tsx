// app/profile/images/page.tsx

export const dynamic = 'force-dynamic';

import Breadcrumbs from "@/app/ui/layout/breadcrumbs";
import { auth } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import ImagesClient from "@/app/ui/images/images-client";

export default async function Page() {
    const session = await auth();
    if (!session) {
        redirect("/?auth=required&callbackUrl=/profile/images");
    }

    return (
        <>
            <Breadcrumbs
                breadcrumbs={[
                    { label: "Profile", href: "/profile" },
                    { label: "Images", href: "/profile/images", active: true },
                ]}
            />
            <ImagesClient authorized={true} />
        </>
    );
}

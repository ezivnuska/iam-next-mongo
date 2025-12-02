// app/page.tsx

import { getPublicContent } from "@/app/lib/actions/public-content";
import UserContentFeed from "@/app/ui/user/user-content-feed";
import DefaultPage from "./ui/layout/page/default-page";
import { Suspense } from "react";
import AuthRedirectHandler from "./ui/auth/auth-redirect-handler";

export default async function Page() {
    const content = await getPublicContent();
    return (
        <DefaultPage>
            <Suspense fallback={null}>
                <AuthRedirectHandler />
            </Suspense>
            <div className="mt-4">
                <UserContentFeed initialContent={content} />
            </div>
        </DefaultPage>
    );
}

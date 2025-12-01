// app/page.tsx

import { getPublicContent } from "@/app/lib/actions/public-content";
import PublicContentFeed from "@/app/ui/public-content-feed";
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
            <PublicContentFeed initialContent={content} />
        </DefaultPage>
    );
}

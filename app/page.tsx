// app/page.tsx

import { getPublicContent } from "@/app/lib/actions/public-content";
import UserContentFeed from "@/app/ui/user/user-content-feed";
import DefaultPage from "./ui/layout/page/default-page";
import { Suspense } from "react";
import AuthRedirectHandler from "./ui/auth/auth-redirect-handler";
import SplitPanel from "./ui/split-panel";
import NewPage from "./ui/layout/page/new-page";
import OverlayPage from "./ui/layout/page/overlay-page";

export default async function Page() {
    const content = await getPublicContent();
    return (
        // <OverlayPage>
        <DefaultPage>
            <div />
            {/* <Suspense fallback={null}>
                <AuthRedirectHandler />
            </Suspense> */}
            {/* <div className="mt-4"> */}
                {/* <UserContentFeed initialContent={content} /> */}
            {/* </div> */}
            {/* <SplitPanel
                defaultOpen={false}
                panelClassName="bg-blue-900"
                buttonClassName="bg-blue-500 text-white"
            /> */}
        </DefaultPage>
        // </OverlayPage>
    );
}

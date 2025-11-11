// app/page.tsx

import { getPublicContent } from "@/app/lib/actions/public-content";
import PublicContentFeed from "@/app/ui/public-content-feed";
import DefaultPage from "./ui/layout/page/default-page";

export default async function Page() {
    const content = await getPublicContent();
    return (
        <DefaultPage>
            <PublicContentFeed initialContent={content} />
        </DefaultPage>
    );
}

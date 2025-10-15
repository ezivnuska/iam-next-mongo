// app/page.tsx

import { getPublicContent } from "@/app/lib/actions/public-content";
import PublicContentFeed from "@/app/ui/public-content-feed";

export default async function Page() {
    const content = await getPublicContent();
    return (
        // <div className='flex flex-col grow'>
            <PublicContentFeed initialContent={content} />
        // </div>
    );
}

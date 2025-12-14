// app/page.tsx

import { getPublicContent } from "@/app/lib/actions/public-content";

export default async function Page() {
    const content = await getPublicContent();
    return <div />;
}

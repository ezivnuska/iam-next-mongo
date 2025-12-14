// app/activity/page.tsx

import { auth } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import Breadcrumbs from "@/app/ui/layout/breadcrumbs";
import ActivityFeed from "@/app/ui/activity/activity-feed";
import { getActivities } from "@/app/lib/actions/activities";

export default async function ActivityPage() {
    const session = await auth();
    if (!session) {
        redirect("/?auth=required&callbackUrl=/activity");
    }

    const activities = await getActivities();

    return (
        <>
            <Breadcrumbs
                breadcrumbs={[
                    { label: "Activity", href: "/activity", active: true },
                ]}
            />
            <ActivityFeed initialActivities={activities} />
        </>
    );
}

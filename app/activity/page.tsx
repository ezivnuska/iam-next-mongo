// app/activity/page.tsx

import ProtectedRoute from "@/app/ui/auth/protected-route";
import Breadcrumbs from "@/app/ui/layout/breadcrumbs";
import ActivityFeed from "@/app/ui/activity/activity-feed";
import { getActivities } from "@/app/lib/actions/activities";
import FullPage from "../ui/layout/page/full-page";
import DefaultPage from "../ui/layout/page/default-page";

export default async function ActivityPage() {
  const activities = await getActivities();

  return (
    <ProtectedRoute>
        <DefaultPage>
            <Breadcrumbs
                breadcrumbs={[
                { label: "Activity", href: "/activity", active: true },
                ]}
            />
            <ActivityFeed initialActivities={activities} />
        </DefaultPage>
    </ProtectedRoute>
  );
}

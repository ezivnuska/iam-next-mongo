// app/activity/page.tsx

import ProtectedRoute from "@/app/ui/auth/protected-route";
import Breadcrumbs from "@/app/ui/layout/breadcrumbs";
import ActivityFeed from "@/app/ui/activity/activity-feed";
import { getActivities, getUserActivities } from "@/app/lib/actions/activities";

export default async function ActivityPage() {
  const activities = await getActivities();
//   const activities = await getUserActivities(50, 0);

  return (
    <ProtectedRoute>
      <Breadcrumbs
        breadcrumbs={[
          { label: "Activity", href: "/activity", active: true },
        ]}
      />
      {/* <div className="mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">My Activity</h1>
        <p className="text-sm text-gray-600 mt-1">
          Track all your actions across the platform
        </p>
      </div> */}
      <ActivityFeed initialActivities={activities} />
    </ProtectedRoute>
  );
}

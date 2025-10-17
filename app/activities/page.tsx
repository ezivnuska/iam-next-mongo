// app/activities/page.tsx

import ProtectedRoute from "@/app/ui/auth/protected-route";
import Breadcrumbs from "@/app/ui/layout/breadcrumbs";
import ActivityFeed from "@/app/ui/activities/activity-feed";
import { getUserActivities } from "@/app/lib/actions/activities";

export default async function ActivitiesPage() {
  const activities = await getUserActivities(50, 0);

  return (
    <ProtectedRoute>
      <Breadcrumbs
        breadcrumbs={[
          { label: "Activities", href: "/activities", active: true },
        ]}
      />
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">My Activities</h1>
        <p className="text-sm text-gray-600 mt-1">
          Track all your actions across the platform
        </p>
      </div>
      <ActivityFeed initialActivities={activities} />
    </ProtectedRoute>
  );
}

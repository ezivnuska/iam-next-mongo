// app/ui/activity/activity-widget.tsx

"use client";

import { useRouter } from "next/navigation";
import type { Activity } from "@/app/lib/definitions/activity";
import { formatRelativeTime } from "@/app/lib/utils/format-date";
import { Button } from "@/app/ui/button";

interface ActivityWidgetProps {
  activities: Activity[];
  limit?: number;
}

const actionIcons: Record<string, string> = {
  create: "➕",
  update: "✏️",
  delete: "🗑️"
};

const actionColors: Record<string, string> = {
  create: "text-green-600",
  update: "text-blue-600",
  delete: "text-red-600"
};

const entityTypeLabels: Record<string, string> = {
  memory: "Memory",
  post: "Post",
  image: "Image",
  comment: "Comment",
  like: "Like",
  friendship: "Friendship"
};

export default function ActivityWidget({ activities, limit = 5 }: ActivityWidgetProps) {
  const router = useRouter();
  const displayActivities = activities.slice(0, limit);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        <Button
          variant="ghost"
          onClick={() => router.push('/activity')}
        >
          View All
        </Button>
      </div>

      {displayActivities.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">
          No recent activities
        </p>
      ) : (
        <div className="space-y-3">
          {displayActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-2 pb-3 border-b border-gray-100 last:border-b-0 last:pb-0"
            >
              {/* Action Icon */}
              <div className={`text-lg ${actionColors[activity.action]}`}>
                {actionIcons[activity.action]}
              </div>

              {/* Activity Details */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{activity.user.username}</span>
                  {' '}
                  <span className="text-gray-600">
                    {activity.action}d a {entityTypeLabels[activity.entityType].toLowerCase()}
                  </span>
                </p>
                {activity.entityData?.content && (
                  <p className="text-xs text-gray-500 line-clamp-1 mt-1">
                    {activity.entityData.content}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {formatRelativeTime(activity.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

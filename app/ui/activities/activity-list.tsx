// app/ui/activities/activity-list.tsx

"use client";

import { useState } from "react";
import type { Activity, ActivityAction, ActivityEntityType } from "@/app/lib/definitions/activity";
import { formatRelativeTime } from "@/app/lib/utils/format-date";
import UserAvatar from "@/app/ui/user/user-avatar";

interface ActivityListProps {
  initialActivities: Activity[];
}

// Icon mapping for different actions
const actionIcons: Record<ActivityAction, string> = {
  create: "➕",
  update: "✏️",
  delete: "🗑️"
};

// Color mapping for different actions
const actionColors: Record<ActivityAction, string> = {
  create: "text-green-600",
  update: "text-blue-600",
  delete: "text-red-600"
};

// Label mapping for entity types
const entityTypeLabels: Record<ActivityEntityType, string> = {
  memory: "Memory",
  post: "Post",
  image: "Image",
  comment: "Comment",
  like: "Like",
  friendship: "Friendship"
};

export default function ActivityList({ initialActivities }: ActivityListProps) {
  const [activities] = useState<Activity[]>(initialActivities);

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No activities yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
        >
          {/* User Avatar */}
          <UserAvatar
            username={activity.user.username}
            avatar={activity.user.avatar}
            size={40}
          />

          {/* Activity Content */}
          <div className="flex-1 min-w-0">
            {/* User and Action */}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-gray-900">
                {activity.user.username}
              </span>
              <span className={`text-sm ${actionColors[activity.action]}`}>
                {actionIcons[activity.action]} {activity.action}d
              </span>
              <span className="text-sm text-gray-600">
                a {entityTypeLabels[activity.entityType].toLowerCase()}
              </span>
            </div>

            {/* Entity Data Preview (if available) */}
            {activity.entityData && (
              <div className="text-sm text-gray-700 bg-gray-50 rounded p-2 mt-2">
                {activity.entityData.content && (
                  <p className="line-clamp-2">{activity.entityData.content}</p>
                )}
                {activity.entityData.title && (
                  <p className="font-medium">{activity.entityData.title}</p>
                )}
                {activity.entityData.hasImage && (
                  <span className="text-xs text-gray-500">📷 with image</span>
                )}
              </div>
            )}

            {/* Timestamp */}
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span>{formatRelativeTime(activity.createdAt)}</span>
              {activity.metadata?.ipAddress && activity.metadata.ipAddress !== 'unknown' && (
                <span>IP: {activity.metadata.ipAddress}</span>
              )}
            </div>
          </div>

          {/* Entity Type Badge */}
          <div className="shrink-0">
            <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
              {entityTypeLabels[activity.entityType]}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

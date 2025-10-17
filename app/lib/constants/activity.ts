// app/lib/constants/activity.ts

import type { ActivityAction, ActivityEntityType } from "@/app/lib/definitions/activity";

// Icon mapping for different actions
export const actionIcons: Record<ActivityAction, string> = {
  create: "➕",
  update: "✏️",
  delete: "🗑️"
};

// Color mapping for different actions
export const actionColors: Record<ActivityAction, string> = {
  create: "text-green-600",
  update: "text-blue-600",
  delete: "text-red-600"
};

// Label mapping for entity types
export const entityTypeLabels: Record<ActivityEntityType, string> = {
  memory: "Memory",
  post: "Post",
  image: "Image",
  comment: "Comment",
  like: "Like",
  friendship: "Friendship"
};

// Filter configurations for activity feed
export const ACTION_FILTERS = [
  { value: 'all' as const, label: 'All' },
  { value: 'create' as const, label: 'Created' },
  { value: 'update' as const, label: 'Updated' },
  { value: 'delete' as const, label: 'Deleted' },
] as const;

export const ENTITY_TYPE_FILTERS = [
  { value: 'memory' as const, label: 'Memories' },
  { value: 'post' as const, label: 'Posts' },
  { value: 'image' as const, label: 'Images' },
  { value: 'comment' as const, label: 'Comments' },
  { value: 'like' as const, label: 'Likes' },
  { value: 'friendship' as const, label: 'Friendships' },
] as const;

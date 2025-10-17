// app/ui/activities/activity-feed.tsx

"use client";

import { useState } from "react";
import type { Activity, ActivityAction, ActivityEntityType } from "@/app/lib/definitions/activity";
import { Button } from "@/app/ui/button";
import ActivityList from "./activity-list";

interface ActivityFeedProps {
  initialActivities: Activity[];
}

type FilterType = 'all' | ActivityAction | ActivityEntityType;

export default function ActivityFeed({ initialActivities }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(false);

  // Filter activities based on selected filter
  const filteredActivities = filter === 'all'
    ? activities
    : activities.filter(activity =>
        activity.action === filter || activity.entityType === filter
      );

  // Fetch activities with filter
  const fetchActivities = async (filterType?: FilterType) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      if (filterType && filterType !== 'all') {
        // Determine if it's an action or entity type
        if (['create', 'update', 'delete'].includes(filterType)) {
          params.append('action', filterType);
        } else {
          params.append('entityType', filterType);
        }
      }

      const response = await fetch(`/api/activities?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch activities');

      const data = await response.json();
      setActivities(data);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    fetchActivities(newFilter);
  };

  return (
    <div className="mt-4">
      {/* Filter Tabs */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2 mb-3">
          <p className="text-sm font-medium text-gray-700 w-full mb-1">Filter by Action:</p>
          <Button
            variant={filter === 'all' ? 'active' : 'ghost'}
            onClick={() => handleFilterChange('all')}
            disabled={loading}
          >
            All
          </Button>
          <Button
            variant={filter === 'create' ? 'active' : 'ghost'}
            onClick={() => handleFilterChange('create')}
            disabled={loading}
          >
            Created
          </Button>
          <Button
            variant={filter === 'update' ? 'active' : 'ghost'}
            onClick={() => handleFilterChange('update')}
            disabled={loading}
          >
            Updated
          </Button>
          <Button
            variant={filter === 'delete' ? 'active' : 'ghost'}
            onClick={() => handleFilterChange('delete')}
            disabled={loading}
          >
            Deleted
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <p className="text-sm font-medium text-gray-700 w-full mb-1">Filter by Type:</p>
          <Button
            variant={filter === 'memory' ? 'active' : 'ghost'}
            onClick={() => handleFilterChange('memory')}
            disabled={loading}
          >
            Memories
          </Button>
          <Button
            variant={filter === 'post' ? 'active' : 'ghost'}
            onClick={() => handleFilterChange('post')}
            disabled={loading}
          >
            Posts
          </Button>
          <Button
            variant={filter === 'image' ? 'active' : 'ghost'}
            onClick={() => handleFilterChange('image')}
            disabled={loading}
          >
            Images
          </Button>
          <Button
            variant={filter === 'comment' ? 'active' : 'ghost'}
            onClick={() => handleFilterChange('comment')}
            disabled={loading}
          >
            Comments
          </Button>
          <Button
            variant={filter === 'like' ? 'active' : 'ghost'}
            onClick={() => handleFilterChange('like')}
            disabled={loading}
          >
            Likes
          </Button>
          <Button
            variant={filter === 'friendship' ? 'active' : 'ghost'}
            onClick={() => handleFilterChange('friendship')}
            disabled={loading}
          >
            Friendships
          </Button>
        </div>
      </div>

      {/* Activity List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">
          Loading activities...
        </div>
      ) : (
        <ActivityList initialActivities={filteredActivities} />
      )}
    </div>
  );
}

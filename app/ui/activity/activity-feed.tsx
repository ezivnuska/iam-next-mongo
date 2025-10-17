// app/ui/activity/activity-feed.tsx

"use client";

import { useState } from "react";
import type { Activity, ActivityAction, ActivityEntityType } from "@/app/lib/definitions/activity";
import { Button } from "@/app/ui/button";
import ActivityList from "./activity-list";
import { ACTION_FILTERS, ENTITY_TYPE_FILTERS } from "@/app/lib/constants/activity";

interface ActivityFeedProps {
  initialActivities: Activity[];
}

type FilterType = 'all' | ActivityAction | ActivityEntityType;

interface FilterButtonProps {
  filterValue: FilterType;
  currentFilter: FilterType;
  label: string;
  onClick: (filter: FilterType) => void;
  disabled?: boolean;
}

function FilterButton({ filterValue, currentFilter, label, onClick, disabled }: FilterButtonProps) {
  return (
    <Button
      variant={currentFilter === filterValue ? 'active' : 'ghost'}
      onClick={() => onClick(filterValue)}
      disabled={disabled}
    >
      {label}
    </Button>
  );
}

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

      const response = await fetch(`/api/activity?${params.toString()}`);
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
          {ACTION_FILTERS.map(({ value, label }) => (
            <FilterButton
              key={value}
              filterValue={value}
              currentFilter={filter}
              label={label}
              onClick={handleFilterChange}
              disabled={loading}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <p className="text-sm font-medium text-gray-700 w-full mb-1">Filter by Type:</p>
          {ENTITY_TYPE_FILTERS.map(({ value, label }) => (
            <FilterButton
              key={value}
              filterValue={value}
              currentFilter={filter}
              label={label}
              onClick={handleFilterChange}
              disabled={loading}
            />
          ))}
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

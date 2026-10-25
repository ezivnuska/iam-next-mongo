'use client';

import { useMemo } from 'react';
import { useRepos } from '../hooks/useRepos';
import events from '../data/events';
import type { FeedItem } from '../types';
import { EventCard } from './EventCard';
import { RepoCard } from './RepoCard';

function parseEventDate(dateStr: string): Date {
  if (dateStr.length === 4) return new Date(`${dateStr}-01-01`);
  return new Date(`${dateStr}-01`);
}

export function TimelineFeed() {
  const { repos, loading, error } = useRepos();

  const feedItems = useMemo(() => {
    const eventItems: FeedItem[] = events.map(e => ({
      kind: 'event' as const,
      sortDate: parseEventDate(e.end),
      data: e,
    }));

    const repoItems: FeedItem[] = repos.map(r => ({
      kind: 'repo' as const,
      sortDate: new Date(r.first_commit_at),
      data: r,
    }));

    const combined = [...eventItems, ...repoItems].sort(
      (a, b) => b.sortDate.getTime() - a.sortDate.getTime()
    );

    const withMarkers: FeedItem[] = [];
    let lastYear: number | null = null;
    for (const item of combined) {
      const year = item.sortDate.getFullYear();
      if (lastYear !== year) {
        withMarkers.push({
          kind: 'marker' as const,
          sortDate: item.sortDate,
          data: { label: String(year) },
        });
        lastYear = year;
      }
      withMarkers.push(item);
    }

    return withMarkers;
  }, [repos]);

  return (
    <div className='space-y-3'>
      {loading && (
        <p className='text-sm text-gray-500 px-1 pb-1'>Loading GitHub repos...</p>
      )}
      {error && (
        <p className='text-sm text-red-500 px-1 pb-1'>{error}</p>
      )}
      {feedItems.map((item, i) => {
        if (item.kind === 'marker') {
          return (
            <div key={`marker-${item.data.label}-${i}`} className='flex items-center gap-3 py-1'>
              <span className='text-sm font-bold text-gray-500'>{item.data.label}</span>
              <div className='flex-1 h-px bg-gray-700' />
            </div>
          );
        }
        if (item.kind === 'event') {
          return (
            <EventCard
              key={`event-${item.data.company}-${item.data.start}`}
              event={item.data}
            />
          );
        }
        if (item.kind === 'repo') {
          return <RepoCard key={`repo-${item.data.id}`} repo={item.data} />;
        }
        return null;
      })}
    </div>
  );
}

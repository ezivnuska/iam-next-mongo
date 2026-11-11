'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRepos } from '../hooks/useRepos';
import rawEvents from '../data/events';
import type { FeedItem, TimelineEvent } from '../types';
import { EventCard } from './EventCard';
import { RepoCard } from './RepoCard';
import { TimelineLoader } from './TimelineLoader';
import type { LineItem } from './TimelineLoader';

function parseEventDate(dateStr: string): Date {
  if (dateStr.length === 4) return new Date(`${dateStr}-01-01`);
  return new Date(`${dateStr}-01`);
}

function line(id: string, text: string, enterDelay = 0): LineItem {
  return { id, text, fading: false, enterDelay };
}

type Phase = 'loading' | 'fading-out' | 'feed';

export function TimelineFeed() {
  const { repos, loading: reposLoading, error: reposError } = useRepos();
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [lines, setLines] = useState<LineItem[]>([line('fetching', 'Fetching projects')]);

  // Phase 1: when repos settle, start the events simulation
  useEffect(() => {
    if (reposLoading) return;

    const repoLine = reposError
      ? line('found-repos', 'Projects unavailable')
      : line('found-repos', `Found ${repos.length} projects`);

    setLines(prev => [
      ...prev.map(l => l.id === 'fetching' ? { ...l, fading: true } : l),
      repoLine,
      line('loading-events', 'Loading employment', 2000),
    ]);
    const removeFetching = setTimeout(() => {
      setLines(prev => prev.filter(l => l.id !== 'fetching'));
    }, 1200);

    // After simulated delay, "Loading employment" fades out as "Found N positions" fades in
    const eventsTimer = setTimeout(() => {
      setEvents(rawEvents);
      setLines(prev => [
        ...prev.map(l => l.id === 'loading-events' ? { ...l, fading: true } : l),
        line('found-events', `Found ${rawEvents.length} positions`),
      ]);
      setTimeout(() => {
        setLines(prev => prev.filter(l => l.id !== 'loading-events'));
      }, 1200);
    }, 4000);

    return () => {
      clearTimeout(removeFetching);
      clearTimeout(eventsTimer);
    };
  }, [reposLoading, repos, reposError]);

  // Phase 2: hold on final message, then start fade-out
  useEffect(() => {
    if (!events) return;
    const timer = setTimeout(() => setPhase('fading-out'), 2500);
    return () => clearTimeout(timer);
  }, [events]);

  // Phase 3: after fade-out completes, show feed
  useEffect(() => {
    if (phase !== 'fading-out') return;
    const timer = setTimeout(() => setPhase('feed'), 1000);
    return () => clearTimeout(timer);
  }, [phase]);

  const feedItems = useMemo(() => {
    if (!events) return [];

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
        withMarkers.push({ kind: 'marker' as const, sortDate: item.sortDate, data: { label: String(year) } });
        lastYear = year;
      }
      withMarkers.push(item);
    }

    return withMarkers;
  }, [repos, events]);

  if (phase !== 'feed') {
    return (
      <div style={{ opacity: phase === 'fading-out' ? 0 : 1, transition: 'opacity 0.4s ease-out' }}>
        <TimelineLoader lines={lines} />
      </div>
    );
  }

  return (
    <div className='space-y-3'>
      {feedItems.map((item, i) => {
        const anim = {
          animation: 'fade-in 0.5s ease-out both',
          animationDelay: `${i * 20}ms`,
        };
        if (item.kind === 'marker') {
          return (
            <div key={`marker-${item.data.label}-${i}`} style={anim} className='flex items-center gap-3 py-1'>
              <span className='text-sm font-bold text-gray-500'>{item.data.label}</span>
              <div className='flex-1 h-px bg-gray-200' />
            </div>
          );
        }
        if (item.kind === 'event') {
          return (
            <div key={`event-${item.data.company}-${item.data.start}`} style={anim}>
              <EventCard event={item.data} />
            </div>
          );
        }
        if (item.kind === 'repo') {
          return (
            <div key={`repo-${item.data.id}`} style={anim}>
              <RepoCard repo={item.data} />
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

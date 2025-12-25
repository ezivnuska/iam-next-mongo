// app/ui/work-timeline.tsx
// Shared component for displaying work history timeline

'use client';

import { useTheme } from '@/app/lib/hooks/use-theme';

export interface Job {
    company: string;
    city: string;
    start: string;
    end: string;
    duration: string;
    title: string;
    bullets: string[];
}

interface WorkTimelineProps {
    jobs: Job[];
}

export function WorkTimeline({ jobs }: WorkTimelineProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    return (
        <div className='space-y-8'>
            {jobs.map((job: Job, index: number) => (
                <div
                    key={`${job.company}-${job.start}-${index}`}
                    className='relative pl-8 border-l-2 pb-2 last:pb-0'
                    style={{ borderColor: isDark ? '#374151' : '#d1d5db' }}
                >
                    {/* Timeline dot */}
                    <div
                        className='absolute -left-[9px] top-0 w-4 h-4 rounded-full'
                        style={{ backgroundColor: isDark ? '#60a5fa' : '#3b82f6' }}
                    ></div>

                    {/* Job header */}
                    <div className='flex flex-1 flex-col -translate-y-2'>
                        <div className='flex flex-wrap items-baseline justify-between gap-2 mb-1'>
                            <h2
                                className='text-2xl font-bold'
                                style={{ color: isDark ? '#ffffff' : '#111827' }}
                            >
                                {job.company}
                            </h2>
                            <span
                                className='text-sm font-medium'
                                style={{ color: isDark ? '#d1d5db' : '#374151' }}
                            >
                                {job.start} - {job.end} ({job.duration})
                            </span>
                        </div>
                        <div className='flex flex-wrap gap-2'>
                            <span
                                className='font-medium'
                                style={{ color: isDark ? '#d1d5db' : '#374151' }}
                            >
                                {job.title}
                            </span>
                            <span style={{ color: isDark ? '#d1d5db' : '#374151' }}>•</span>
                            <span style={{ color: isDark ? '#d1d5db' : '#374151' }}>{job.city}</span>
                        </div>
                    </div>

                    {/* Job responsibilities */}
                    <ul className='mt-1 space-y-2'>
                        {job.bullets.map((bullet: string, bulletIndex: number) => (
                            <li key={bulletIndex} className='flex items-start gap-2'>
                                <span style={{ color: isDark ? '#60a5fa' : '#3b82f6' }}>▸</span>
                                <span
                                    className='flex-1'
                                    style={{ color: isDark ? '#d1d5db' : '#374151' }}
                                >
                                    {bullet}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}

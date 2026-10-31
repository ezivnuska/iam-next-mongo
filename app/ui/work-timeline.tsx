// app/ui/work-timeline.tsx

'use client';

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
    return (
        <div className='space-y-8'>
            {jobs.map((job: Job, index: number) => (
                <div
                    key={`${job.company}-${job.start}-${index}`}
                    className='relative pl-8 border-l-2 border-gray-300 dark:border-gray-700 pb-2 last:pb-0'
                >
                    <div className='absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 dark:bg-blue-400' />

                    <div className='flex flex-1 flex-col -translate-y-2'>
                        <div className='flex flex-wrap items-baseline justify-between gap-2 mb-1'>
                            <h2 className='text-2xl font-bold text-gray-900 dark:text-white'>
                                {job.company}
                            </h2>
                            <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                                {job.start} - {job.end} ({job.duration})
                            </span>
                        </div>
                        <div className='flex flex-wrap gap-2 text-gray-700 dark:text-gray-300'>
                            <span className='font-medium'>{job.title}</span>
                            <span>•</span>
                            <span>{job.city}</span>
                        </div>
                    </div>

                    <ul className='mt-1 space-y-2'>
                        {job.bullets.map((bullet: string, bulletIndex: number) => (
                            <li key={bulletIndex} className='flex items-start gap-2'>
                                <span className='text-blue-500 dark:text-blue-400'>▸</span>
                                <span className='flex-1 text-gray-700 dark:text-gray-300'>{bullet}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}

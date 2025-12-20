// app/ui/work-timeline.tsx
// Shared component for displaying work history timeline

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
                    className='relative pl-8 border-l-2 border-gray-700 pb-2 last:pb-0'
                >
                    {/* Timeline dot */}
                    <div className='absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500'></div>

                    {/* Job header */}
                    <div className='flex flex-1 flex-col -translate-y-2'>
                        <div className='flex flex-wrap items-baseline justify-between gap-2 mb-1'>
                            <h2 className='text-2xl font-bold'>{job.company}</h2>
                            <span className='text-sm font-medium'>
                                {job.start} - {job.end} ({job.duration})
                            </span>
                        </div>
                        <div className='flex flex-wrap gap-2'>
                            <span className='font-medium'>{job.title}</span>
                            <span>•</span>
                            <span>{job.city}</span>
                        </div>
                    </div>

                    {/* Job responsibilities */}
                    <ul className='mt-1 space-y-2'>
                        {job.bullets.map((bullet: string, bulletIndex: number) => (
                            <li key={bulletIndex} className='flex items-start gap-2'>
                                <span className='text-blue-400'>▸</span>
                                <span className='flex-1'>{bullet}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}

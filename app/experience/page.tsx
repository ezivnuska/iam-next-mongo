// app/experience/page.tsx

import DefaultPage from '../ui/layout/page/default-page';
import jobs from './jobs'
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Experience',
  description: 'Professional work experience and career history',
};

interface Job {
  company: string;
  city: string;
  start: string;
  end: string;
  duration: string;
  title: string;
  bullets: string[];
}

export default function ExperiencePage() {
  return (
    <DefaultPage>
        <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-2 text-gray-900">Experience</h1>
        <p className="text-gray-600 mb-8">Professional work history</p>

        <div className="space-y-8">
            {jobs.map((job: Job, index: number) => (
            <div
                key={`${job.company}-${job.start}-${index}`}
                className="relative pl-8 border-l-2 border-gray-200 pb-8 last:pb-0"
            >
                {/* Timeline dot */}
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-2 border-white"></div>

                {/* Job header */}
                <div className="mb-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                    <h2 className="text-2xl font-bold text-gray-900">{job.company}</h2>
                    <span className="text-sm text-gray-500 font-medium">
                    {job.start} - {job.end} ({job.duration})
                    </span>
                </div>
                <div className="flex flex-wrap gap-2 text-gray-600">
                    <span className="font-medium">{job.title}</span>
                    <span>•</span>
                    <span>{job.city}</span>
                </div>
                </div>

                {/* Job responsibilities */}
                <ul className="space-y-2">
                {job.bullets.map((bullet: string, bulletIndex: number) => (
                    <li key={bulletIndex} className="flex items-start gap-2 text-gray-700">
                    <span className="text-blue-500 mt-1.5">▸</span>
                    <span className="flex-1">{bullet}</span>
                    </li>
                ))}
                </ul>
            </div>
            ))}
        </div>
        </div>
    </DefaultPage>
  );
}

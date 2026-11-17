'use client';

import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import type { TimelineEvent } from '../types';

function formatDate(dateStr: string): string {
  if (dateStr.length === 4) return dateStr;
  const [year, month] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(month) - 1]} ${year}`;
}

export function EventCard({ event }: { event: TimelineEvent }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className='rounded-2xl border-2 border-gray-200 bg-white overflow-hidden'>
      <button
        type='button'
        onClick={() => setExpanded(e => !e)}
        className='w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 transition-colors'
      >
        <div className='flex-1'>
          <div className='flex items-baseline gap-2 flex-wrap'>
            <span className='text-gray-900 font-semibold'>{event.company}</span>
            <span className='text-gray-500 text-sm'>{event.title}</span>
          </div>
          <div className='text-gray-400 text-xs mt-0.5'>
            {event.city} · {formatDate(event.start)} – {formatDate(event.end)}
          </div>
        </div>
        <ChevronDownIcon
          className={`w-4 h-4 text-gray-500 mt-1 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      <div className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-h-[600px]' : 'max-h-0'}`}>
        <div className='px-4 pb-4 space-y-3'>
          <ul className='space-y-1.5'>
            {event.bullets.map((bullet, i) => (
              <li key={i} className='text-sm text-gray-600 flex gap-2'>
                <span className='text-gray-400 shrink-0 mt-0.5'>•</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
          {event.clients && event.clients.length > 0 && (
            <div className='flex flex-wrap gap-1.5'>
              {event.clients.map(client => (
                <span key={client} className='text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600'>
                  {client}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

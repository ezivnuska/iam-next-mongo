'use client';

import { useState } from 'react';
import { ChevronDownIcon, StarIcon, CodeBracketIcon } from '@heroicons/react/24/outline';
import type { Repo } from '../types';

function formatIsoDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function RepoCard({ repo }: { repo: Repo }) {
  const [expanded, setExpanded] = useState(false);
  const link = repo.homepage || repo.html_url;

  return (
    <div className='rounded-2xl border-2 border-gray-700 bg-gray-800 overflow-hidden'>
      <button
        type='button'
        onClick={() => setExpanded(e => !e)}
        className='w-full flex items-start gap-3 p-4 text-left hover:bg-gray-700 transition-colors'
      >
        <CodeBracketIcon className='w-5 h-5 text-gray-500 shrink-0 mt-0.5' />
        <div className='flex-1 min-w-0'>
          <span className='text-white font-medium truncate block'>{repo.name}</span>
          <div className='text-gray-500 text-xs mt-0.5'>
            {formatIsoDate(repo.first_commit_at)} – {formatIsoDate(repo.pushed_at)}
            {repo.language && <span> · {repo.language}</span>}
          </div>
        </div>
        {repo.stargazers_count > 0 && (
          <div className='flex items-center gap-0.5 text-gray-500 text-xs shrink-0 mt-0.5'>
            <StarIcon className='w-3.5 h-3.5' />
            <span>{repo.stargazers_count}</span>
          </div>
        )}
        <ChevronDownIcon
          className={`w-4 h-4 text-gray-500 shrink-0 mt-0.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      <div className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-h-[400px]' : 'max-h-0'}`}>
        <div className='px-4 pb-4 space-y-2'>
          {repo.description && (
            <p className='text-sm text-gray-300'>{repo.description}</p>
          )}
          {repo.topics.length > 0 && (
            <div className='flex flex-wrap gap-1.5'>
              {repo.topics.map(topic => (
                <span key={topic} className='text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400'>
                  {topic}
                </span>
              ))}
            </div>
          )}
          <a
            href={link}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-block text-xs text-blue-400 hover:text-blue-300 underline'
            onClick={e => e.stopPropagation()}
          >
            {repo.homepage ? 'Visit site' : 'View on GitHub'}
          </a>
        </div>
      </div>
    </div>
  );
}

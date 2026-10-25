'use client';

import { useEffect, useState } from 'react';
import { Repo } from '../types';

const OWNER = 'ezivnuska';
const GITHUB_TOKEN = process.env.NEXT_PUBLIC_GITHUB_TOKEN ?? '';

const authHeaders: Record<string, string> = GITHUB_TOKEN
  ? { Authorization: `token ${GITHUB_TOKEN}` }
  : {};

type GitHubRepo = Omit<Repo, 'first_commit_at'>;

const firstCommitCache = new Map<string, string>();

async function fetchFirstCommitDate(repoName: string, signal: AbortSignal): Promise<string | null> {
  if (firstCommitCache.has(repoName)) return firstCommitCache.get(repoName)!;
  try {
    const res1 = await fetch(
      `https://api.github.com/repos/${OWNER}/${repoName}/commits?per_page=1`,
      { headers: authHeaders, signal }
    );
    if (!res1.ok) return null;

    const link = res1.headers.get('Link');
    const lastMatch = link?.match(/page=(\d+)>; rel="last"/);

    if (!lastMatch) {
      const commits = await res1.json();
      const date = commits[0]?.commit?.author?.date ?? null;
      if (date) firstCommitCache.set(repoName, date);
      return date;
    }

    const res2 = await fetch(
      `https://api.github.com/repos/${OWNER}/${repoName}/commits?per_page=1&page=${lastMatch[1]}`,
      { headers: authHeaders, signal }
    );
    if (!res2.ok) return null;
    const commits = await res2.json();
    const date = commits[0]?.commit?.author?.date ?? null;
    if (date) firstCommitCache.set(repoName, date);
    return date;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw err;
    return null;
  }
}

async function withConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

export function useRepos(): { repos: Repo[]; loading: boolean; error: string | null } {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    fetch(`https://api.github.com/users/${OWNER}/repos?per_page=100&sort=updated`, {
      headers: authHeaders,
      signal,
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<GitHubRepo[]>;
      })
      .then(async (data) => {
        const withFirstCommits = await withConcurrency(
          data.map(repo => async (): Promise<Repo> => {
            const first_commit_at = await fetchFirstCommitDate(repo.name, signal);
            return { ...repo, first_commit_at: first_commit_at ?? repo.created_at };
          }),
          5
        );
        if (!signal.aborted) setRepos(withFirstCommits);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name !== 'AbortError') setError('Failed to load repositories');
      })
      .finally(() => {
        if (!signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  return { repos, loading, error };
}

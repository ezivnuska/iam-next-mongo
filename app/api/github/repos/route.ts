import { NextResponse } from 'next/server';
import type { Repo } from '@/app/about/timeline/types';
import { requireAuth } from '@/app/lib/utils/auth';

const OWNER = 'ezivnuska';
const TOKEN = process.env.GITHUB_TOKEN ?? '';

const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

type GitHubRepo = Omit<Repo, 'first_commit_at'>;

async function fetchFirstCommitDate(repoName: string): Promise<string | null> {
    const res = await fetch(
        `https://api.github.com/repos/${OWNER}/${repoName}/commits?per_page=1`,
        { headers }
    );
    if (!res.ok) return null;

    const link = res.headers.get('Link');
    const lastMatch = link?.match(/page=(\d+)>; rel="last"/);

    if (!lastMatch) {
        const commits = await res.json();
        return commits[0]?.commit?.author?.date ?? null;
    }

    const res2 = await fetch(
        `https://api.github.com/repos/${OWNER}/${repoName}/commits?per_page=1&page=${lastMatch[1]}`,
        { headers }
    );
    if (!res2.ok) return null;
    const commits = await res2.json();
    return commits[0]?.commit?.author?.date ?? null;
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

export async function GET() {
    try { await requireAuth() } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const res = await fetch(
        `https://api.github.com/users/${OWNER}/repos?per_page=100&sort=updated`,
        { headers, next: { revalidate: 3600 } }
    );

    if (!res.ok) {
        return NextResponse.json(
            { error: `GitHub API error: ${res.status}` },
            { status: res.status }
        );
    }

    const data: GitHubRepo[] = await res.json();

    const repos = await withConcurrency(
        data.map(repo => async (): Promise<Repo> => {
            const first_commit_at = await fetchFirstCommitDate(repo.name);
            return { ...repo, first_commit_at: first_commit_at ?? repo.created_at };
        }),
        5
    );

    return NextResponse.json(repos);
}

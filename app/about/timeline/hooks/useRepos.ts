'use client';

import { useEffect, useState } from 'react';
import { Repo } from '../types';

export function useRepos(): { repos: Repo[]; loading: boolean; error: string | null } {
    const [repos, setRepos] = useState<Repo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        fetch('/api/github/repos', { signal: controller.signal })
            .then(res => {
                if (!res.ok) throw new Error(`${res.status}`);
                return res.json() as Promise<Repo[]>;
            })
            .then(data => {
                if (!controller.signal.aborted) setRepos(data);
            })
            .catch((err: unknown) => {
                if (err instanceof Error && err.name !== 'AbortError') {
                    setError('Failed to load repositories');
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, []);

    return { repos, loading, error };
}

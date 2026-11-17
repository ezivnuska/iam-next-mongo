export interface TimelineEvent {
  company: string;
  city: string;
  start: string;
  end: string;
  title: string;
  bullets: string[];
  clients?: string[];
}

export interface Repo {
  id: number;
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  html_url: string;
  homepage: string | null;
  topics: string[];
  license: { spdx_id: string; name: string } | null;
  created_at: string;
  pushed_at: string;
  updated_at: string;
  first_commit_at: string;
}

export type FeedItem =
  | { kind: 'event'; sortDate: Date; data: TimelineEvent }
  | { kind: 'repo'; sortDate: Date; data: Repo }
  | { kind: 'marker'; sortDate: Date; data: { label: string } }

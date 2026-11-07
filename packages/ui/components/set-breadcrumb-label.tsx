'use client';

import { useSetBreadcrumbLabel } from '../providers/breadcrumb-provider';

interface Props {
    segment: string;
    label: string;
}

// Renders nothing — use in server pages to override a URL segment's display label.
// E.g. <SetBreadcrumbLabel segment={postId} label={post.title} />
export default function SetBreadcrumbLabel({ segment, label }: Props) {
    useSetBreadcrumbLabel(segment, label);
    return null;
}

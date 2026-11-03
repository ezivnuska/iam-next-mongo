'use client';

import { useSelectedLayoutSegments } from 'next/navigation';
import { useBreadcrumbContext } from '../providers/breadcrumb-provider';
import { getRouteLabel } from '../lib/route-labels';

export interface Breadcrumb {
    label: string;
    href: string;
    active: boolean;
}

export function useBreadcrumbs(): Breadcrumb[] {
    const segments = useSelectedLayoutSegments();
    const { overrides } = useBreadcrumbContext();

    return segments.map((segment, i) => ({
        label: getRouteLabel(segment, overrides),
        href: '/' + segments.slice(0, i + 1).join('/'),
        active: i === segments.length - 1,
    }));
}

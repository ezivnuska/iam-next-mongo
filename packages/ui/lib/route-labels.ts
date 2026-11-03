const ROUTE_LABELS: Record<string, string> = {
    users: 'Users',
    about: 'About',
    eric: 'Eric',
    work: 'Work',
    timeline: 'Timeline',
    sandbox: 'Sandbox',
    profile: 'Profile',
    settings: 'Settings',
    feed: 'Feed',
    images: 'Images',
};

export function getRouteLabel(segment: string, overrides?: Map<string, string>): string {
    return overrides?.get(segment) ?? ROUTE_LABELS[segment] ?? segment;
}

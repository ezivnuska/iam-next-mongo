// app/users/[username]/[id]/page.tsx

export const dynamic = 'force-dynamic';

import { auth } from '@/app/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getContentDetailByUsername } from '@/app/lib/actions/content-detail';
import PageContent from '@/app/ui/layout/page/page-content';
import Breadcrumbs from '@/app/ui/layout/breadcrumbs';
import ContentDetailView from '@/app/ui/content-detail-view';
import type { Metadata } from 'next';
import { isMemory, isPost, isImage } from '@/app/lib/utils/content-helpers';

interface Props {
    params: Promise<{ username: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { username, id } = await params;

    // Fetch content
    const content = await getContentDetailByUsername(username, id);

    if (!content) {
        return {
            title: 'Not Found',
        };
    }

    let title: string;
    let description: string;

    if (isMemory(content)) {
        title = `Memory${content.title ? `: ${content.title}` : ''} - ${content.author.username}`;
        description = content.content?.substring(0, 160) || `A memory shared by ${content.author.username}`;
    } else if (isPost(content)) {
        title = `Post by ${content.author.username}`;
        description = content.content?.substring(0, 160) || `A post by ${content.author.username}`;
    } else {
        title = 'Content';
        description = 'View content';
    }

    return {
        title,
        description,
    };
}

export default async function ContentDetailPage({ params }: Props) {
    const { username, id } = await params;

    // Require authentication
    const session = await auth();
    if (!session) {
        redirect(`/?auth=required&callbackUrl=/users/${username}/${id}`);
    }

    // Fetch content and validate ownership
    const content = await getContentDetailByUsername(username, id);

    // Return 404 if content not found or doesn't belong to this username
    if (!content) {
        notFound();
    }

    // Only posts and memories have detail pages
    if (isImage(content)) {
        notFound();
    }

    // Determine breadcrumb label
    const contentLabel = isPost(content) ? 'Post' : 'Memory';

    return (
        <PageContent>
            <Breadcrumbs
                breadcrumbs={[
                    { label: 'Users', href: '/users' },
                    { label: username, href: `/users/${username}` },
                    { label: contentLabel, href: `/users/${username}/${id}`, active: true },
                ]}
            />
            <ContentDetailView item={content} />
        </PageContent>
    );
}

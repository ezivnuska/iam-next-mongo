import { Metadata } from 'next';
import { auth } from '@/app/lib/auth';
import { redirect } from 'next/navigation';
import { PageContent, PageHeader } from '@iam/ui';
import DeleteAccountSection from './delete-account-section';

export const metadata: Metadata = {
    title: 'Settings',
};

export default async function SettingsPage() {
    const session = await auth();
    if (!session?.user) redirect('/?auth=required&callbackUrl=/settings');

    return (
        <PageContent header={<PageHeader subtitle='Settings' />}>
            <div className='px-4 py-6 flex flex-col gap-8 max-w-lg'>
                <section className='flex flex-col gap-3'>
                    <h2 className='text-sm font-semibold text-gray-500 uppercase tracking-wide'>Danger zone</h2>
                    <DeleteAccountSection />
                </section>
            </div>
        </PageContent>
    );
}

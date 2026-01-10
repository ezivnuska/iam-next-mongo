// app/not-found.tsx

import Link from 'next/link';
import PageContent from '@/app/ui/layout/page/page-content';
import { Button } from '@/app/ui/button';

export default function NotFound() {
    return (
        <PageContent>
            <div className='flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4'>
                <div className='text-center space-y-4'>
                    <h1 className='text-9xl font-bold text-gray-300 dark:text-gray-700'>
                        404
                    </h1>
                    <h2 className='text-3xl font-bold text-gray-900 dark:text-white'>
                        Page Not Found
                    </h2>
                    <p className='text-lg text-gray-600 dark:text-gray-400 max-w-md'>
                        The page you&apos;re looking for doesn&apos;t exist or has been moved.
                    </p>
                </div>

                <div className='flex gap-4 mt-4'>
                    <Link href='/'>
                        <Button>
                            Go Home
                        </Button>
                    </Link>
                    <Link href='/games'>
                        <Button variant='secondary'>
                            Play Games
                        </Button>
                    </Link>
                </div>
            </div>
        </PageContent>
    );
}

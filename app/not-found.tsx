// app/not-found.tsx

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className='flex flex-col items-center justify-center min-h-screen'>
      <h1 className='text-4xl font-bold mb-4'>404</h1>
      <p className='text-xl mb-6'>Page not found</p>
      <Link href='/' className='text-blue-500 hover:text-blue-700'>
        Return Home
      </Link>
    </div>
  );
}

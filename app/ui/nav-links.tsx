'use client';

import {
  UserGroupIcon,
  HomeIcon,
  DocumentDuplicateIcon,
  NewspaperIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';


// Map of links to display in the side navigation.
// Depending on the size of the application, this would be stored in a database.
const links = [
  {
    name: 'Users',
    href: '/users',
    icon: UserGroupIcon,
  },
  {
    name: 'Posts',
    href: '/posts',
    icon: NewspaperIcon,
  },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <div className='flex flex-row w-full'>
      {links.map((link) => {
        const LinkIcon = link.icon;
        return (
          <Link
            key={link.name}
            href={link.href}
            // className='flex flex-col p-1 text-blue-600 items-center justify-center'
            className={clsx(
              'flex flex-col items-center justify-center rounded-md bg-gray-50 text-sm font-medium m-1 p-1 hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start',
              {
                'bg-sky-100 text-blue-600': pathname === link.href,
              },
            )}
          >
            <LinkIcon
                className="w-6 self-center"
            />
            <p className="text-xs hidden md:block">{link.name}</p>
          </Link>
        );
      })}
    </div>
  );
}

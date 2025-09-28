import SideNav from '@/app/ui/sidenav';
import Link from 'next/link';
import NavLinks from '@/app/ui/nav-links';
import { PowerIcon } from '@heroicons/react/24/outline';
// import { signOut } from '@/auth';

export default function Header() {
  return (
      <div className="flex flex-row w-full items-center gap-2">
        <Link
            href='/'
            className="px-2"
        >
            <h1 className="text-[32px] font-bold">iameric</h1>
        </Link>
        <div className="flex w-full">
            <NavLinks />
        </div>
    </div>
  );
}

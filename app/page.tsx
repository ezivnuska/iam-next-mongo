import Header from '@/app/ui/header'
import Link from 'next/link';
import Image from 'next/image';
import styles from '@/app/ui/home.module.css';
import { lusitana } from '@/app/ui/fonts';

export default function Page() {
  return (
    <main className="flex grow flex-col p-2">
        <p className={`${lusitana.className} text-xl text-gray-800 md:text-3xl md:leading-normal`}>
            <strong>Welcome.</strong> This is my site.
        </p>
    </main>
  );
}

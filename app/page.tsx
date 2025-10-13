import Header from '@/app/ui/header/header'
import Link from 'next/link';
import Image from 'next/image';
import styles from '@/app/ui/home.module.css';
import { ubuntu } from '@/app/ui/fonts';
import Main from '@/app/ui/layout/main';

export default function Page() {
  return (
    <Main>
        <p className={`${ubuntu.className} text-xl text-gray-800 md:text-3xl md:leading-normal`}>
            <strong>Welcome.</strong> This is my site.
        </p>
    </Main>
  );
}

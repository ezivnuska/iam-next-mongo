// app/profile/images/page.tsx

import Breadcrumbs from "../../ui/breadcrumbs";
import { auth } from "@/app/api/auth/[...nextauth]/route";
import { getImages } from "@/app/lib/actions/images";
import ImagesClient from "./ImagesClient";
import type { Image } from "@/app/lib/definitions";
import Link from "next/link";

export default async function Page() {
  const session = await auth();

  if (!session) {
    return (
      <main className="flex grow flex-col p-2">
        <p>You must be signed in to view your images.</p>
        <Link href="/auth/signin" className="text-blue-500 underline">
          Sign In
        </Link>
      </main>
    );
  }

  const imagesFromServer = await getImages();
  const images: Image[] = imagesFromServer;

  return (
    <main className="flex grow flex-col p-2">
      <Breadcrumbs
        breadcrumbs={[
          { label: "Profile", href: "/profile" },
          { label: "Images", href: "/profile/images", active: true },
        ]}
      />
      <ImagesClient initialImages={images} />
    </main>
  );
}

// app/profile/images/page.tsx

import Breadcrumbs from "../../ui/breadcrumbs";
import ProtectedRoute from "@/app/ui/protected-route";
import ImagesClient from "./ImagesClient";
import { getImages } from "@/app/lib/actions/images";

export default async function Page() {
  const images = await getImages();

  return (
    <ProtectedRoute>
      <main className="flex grow flex-col p-2">
        <Breadcrumbs
          breadcrumbs={[
            { label: "Profile", href: "/profile" },
            { label: "Images", href: "/profile/images", active: true },
          ]}
        />
        <ImagesClient initialImages={images} />
      </main>
    </ProtectedRoute>
  );
}

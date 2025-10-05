// app/profile/images/page.tsx

import Breadcrumbs from "../../ui/breadcrumbs";
import ProtectedRoute from "@/app/ui/protected-route";
import ImagesClient from "./images-client";
import { getImages } from "@/app/lib/actions/images";
import Main from "@/app/ui/main";

export default async function Page() {
  const images = await getImages();

  return (
    <ProtectedRoute>
      <Main>
        <Breadcrumbs
          breadcrumbs={[
            { label: "Profile", href: "/profile" },
            { label: "Images", href: "/profile/images", active: true },
          ]}
        />
        <ImagesClient initialImages={images} />
      </Main>
    </ProtectedRoute>
  );
}

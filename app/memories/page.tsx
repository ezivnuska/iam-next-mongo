// app/memories/page.tsx

import { getMemories } from "@/app/lib/actions/memories";
import ProtectedRoute from "@/app/ui/auth/protected-route";
import Main from "@/app/ui/layout/main";
import Breadcrumbs from "../ui/layout/breadcrumbs";
import MemoriesClient from "@/app/ui/memories/memories-client";

export default async function Page() {
  const memories = await getMemories();
  return (
    <ProtectedRoute>
      <Main>
        <Breadcrumbs
            breadcrumbs={[
                { label: "Memories", href: "/memories", active: true },
            ]}
        />
        <MemoriesClient initialMemories={memories} />
      </Main>
    </ProtectedRoute>
  );
}

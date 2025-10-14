// app/memories/page.tsx

import { getMemories } from "@/app/lib/actions/memories";
import ProtectedRoute from "@/app/ui/auth/protected-route";
import Main from "@/app/ui/layout/main";
import Breadcrumbs from "../ui/layout/breadcrumbs";
import ContentClient from "../ui/content-client";
import MemoryList from "../ui/memories/memory-list";
import CreateMemoryForm from "../ui/memories/create-memory-form";

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
        <ContentClient
            initialItems={memories}
            addButtonText="Add Memory"
            createModalTitle="Create a Memory"
            editModalTitle="Edit Memory"
            ListComponent={MemoryList}
            FormComponent={CreateMemoryForm}
        />
      </Main>
    </ProtectedRoute>
  );
}

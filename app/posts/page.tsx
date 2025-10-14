// app/posts/page.tsx

import { getPosts } from "@/app/lib/actions/posts";
import ProtectedRoute from "@/app/ui/auth/protected-route";
import Main from "@/app/ui/layout/main";
import Breadcrumbs from "../ui/layout/breadcrumbs";
import ContentClient from "../ui/content-client";
import PostList from "../ui/posts/post-list";
import CreatePostForm from "../ui/posts/create-post-form";

export default async function Page() {
  const posts = await getPosts();
  return (
    <ProtectedRoute>
      <Main>
        <Breadcrumbs
            breadcrumbs={[
                { label: "Posts", href: "/posts", active: true },
            ]}
        />
        <ContentClient
            initialItems={posts}
            addButtonText="Add Post"
            createModalTitle="Create a Post"
            editModalTitle="Edit Post"
            ListComponent={PostList}
            FormComponent={CreatePostForm}
        />
      </Main>
    </ProtectedRoute>
  );
}

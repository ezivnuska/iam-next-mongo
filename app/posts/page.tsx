// app/posts/page.tsx

import { getPosts } from "@/app/lib/actions/posts";
import ProtectedRoute from "@/app/ui/auth/protected-route";
import Main from "@/app/ui/layout/main";
import Breadcrumbs from "../ui/layout/breadcrumbs";
import PostsClient from "@/app/ui/posts/posts-client";

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
        <PostsClient initialPosts={posts} />
      </Main>
    </ProtectedRoute>
  );
}

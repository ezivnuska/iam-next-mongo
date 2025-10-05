// app/posts/page.tsx

import { lusitana } from "@/app/ui/fonts";
import { getPosts } from "@/app/lib/actions/posts";
import ProtectedRoute from "@/app/ui/protected-route";
import type { Post } from "@/app/lib/definitions/post";
import Main from "../ui/main";

export default async function Page() {
  const posts: Post[] = await getPosts();

  return (
    <ProtectedRoute>
      <Main>
        <p className={`${lusitana.className} text-xl text-gray-800 md:text-3xl md:leading-normal`}>
          <strong>Posts</strong>
        </p>
        <div>
          {posts.length ? (
            posts.map((post) => {
              const medium = post.image?.variants.find((v) => v.size === "medium");
              return (
                <div key={post.id} className="mb-2 p-2 border rounded">
                    <p className="font-semibold">{post.author.username}</p>
                    <p>{post.content}</p>
                    {post.image && <img src={medium?.url} alt="Post image" className="max-h-40 mt-2" />}
                    {post.linkUrl && (
                    <a href={post.linkUrl} target="_blank" className="text-blue-500 underline">
                        {post.linkPreview?.title || post.linkUrl}
                    </a>
                    )}
                </div>
              )})
          ) : (
            <p>No posts</p>
          )}
        </div>
      </Main>
    </ProtectedRoute>
  );
}

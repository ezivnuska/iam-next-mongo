import { lusitana } from '@/app/ui/fonts';
import { getPosts } from '@/app/lib/actions';

export default async function Page() {
  const posts = await getPosts()
  return (
    <main className="flex grow flex-col p-2">
        <p className={`${lusitana.className} text-xl text-gray-800 md:text-3xl md:leading-normal`}>
            <strong>Posts</strong>
        </p>
        <div>
            {posts?.length
                ? posts?.map((post, index) => <p key={index}>{String(post._id)}</p>)
                : <p>No posts</p>
            }
        </div>
    </main>
  );
}
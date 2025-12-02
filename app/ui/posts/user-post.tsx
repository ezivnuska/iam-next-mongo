// app/ui/posts/user-post.tsx

"use client";

import { formatRelativeTime } from "@/app/lib/utils/format-date";
import { useUser } from "@/app/lib/providers/user-provider";
import type { Post } from "@/app/lib/definitions/post";
import EditContentButton from "../edit-content-button";
import FlagContentButton from "../flag-content-button";
// import UserContentHeader from "../user-content-header";
import UserAvatar from "../user/user-avatar";
import { useRouter } from "next/navigation";
import DeleteButtonWithConfirm from "../delete-button-with-confirm";
import ContentInteractions from "../content-interactions";

interface UserPostProps {
    post: Post;
    onDeleted: (postId: string) => void;
    onEdit: (post: Post) => void;
    onFlag: (post: Post) => void;
}

export default function UserPost({ post, onDeleted, onEdit, onFlag }: UserPostProps) {
    const { user } = useUser();
    const medium = post.image?.variants.find((v) => v.size === "medium");
    const isAuthor = user?.id === post.author.id;
    const isAdmin = user?.role === "admin";
    const canEdit = isAuthor;
    const canDelete = isAuthor || isAdmin;

    const handleDelete = async () => {
        const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete post");
        onDeleted(post.id);
    };

    const router = useRouter();

    const handleUsernameClick = () => {
        if (user?.username === post.author.username) {
            router.push('/profile');
        } else {
            router.push(`/users/${post.author.username}`);
        }
    };

    if (!user) return null;

    return (
        <div className="flex flex-row items-stretch gap-2">
            <div className="flex flex-col items-center justify-between gap-2 pb-1">
                <div className="flex w-12 h-12">
                    <UserAvatar
                        username={user.username}
                        avatar={user.avatar}
                        // size={40}
                    />
                </div>
                <FlagContentButton onFlag={() => onFlag(post)} />
            </div>
            <div className="flex flex-1 flex-col">
                <div className="flex flex-row items-center">
                    <div className="flex flex-1 flex-col">
                        <p
                            className="text-lg font-semibold cursor-pointer hover:underline"
                            onClick={handleUsernameClick}
                        >
                            {post.author.username}
                        </p>
                        <span className="text-sm text-gray-500">{formatRelativeTime(post.createdAt)}</span>
                    </div>
                    {canDelete && <DeleteButtonWithConfirm onDelete={handleDelete} />}
                </div>
                <div className="flex flex-row items-stretch pt-1">
                    <div className='flex flex-1 flex-col pt-2'>
                        {post.image && (
                            <img
                                src={medium?.url}
                                alt="Post image"
                                className="w-full max-h-96 rounded mt-2 object-cover"
                            />
                        )}
                        {post.content && <p className='my-2'>{post.content}</p>}
                        {post.linkUrl && (
                            <a href={post.linkUrl} target="_blank" className="text-blue-500 underline mt-2 block">
                                [source]
                            </a>
                        )}
                        <ContentInteractions
                            itemId={post.id}
                            itemType="Post"
                            initialLiked={post.likedByCurrentUser}
                            initialLikeCount={post.likes?.length || 0}
                            initialCommentCount={post.commentCount || 0}
                        />
                    </div>
                    <div className='flex flex-col items-start gap-2 pt-1'>
                        {canEdit && <EditContentButton onEdit={() => onEdit(post)} />}
                    </div>
                </div>
            </div>
        </div>
    );
}

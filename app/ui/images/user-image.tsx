// app/ui/images/user-image.tsx

"use client";

import { formatRelativeTime } from "@/app/lib/utils/format-date";
import { useUser } from "@/app/lib/providers/user-provider";
import type { Image } from "@/app/lib/definitions/image";
import FlagContentButton from "../flag-content-button";
import UserAvatar from "../user/user-avatar";
import { useRouter } from "next/navigation";
import DeleteButtonWithConfirm from "../delete-button-with-confirm";
import ContentInteractions from "../content-interactions";
import { getBestVariant, IMAGE_SIZES } from "@/app/lib/utils/image-variant";

interface UserImageProps {
    image: Image;
    onDeleted: (imageId: string) => void;
}

export default function UserImage({ image, onDeleted }: UserImageProps) {
    const { user } = useUser();
    const bestVariant = getBestVariant(image, IMAGE_SIZES.CONTENT);
    const isAuthor = user?.id === image.userId;
    const isAdmin = user?.role === "admin";
    const canDelete = isAuthor || isAdmin;

    const handleDelete = async () => {
        const res = await fetch(`/api/images/${image.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete image");
        onDeleted(image.id);
    };

    const router = useRouter();

    const handleUsernameClick = () => {
        if (user?.username === image.username) {
            router.push('/profile');
        } else {
            router.push(`/users/${image.username}`);
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
                    />
                </div>
                <FlagContentButton onFlag={() => {}} />
            </div>
            <div className="flex flex-1 flex-col">
                <div className="flex flex-row items-center">
                    <div className="flex flex-1 flex-col">
                        <p
                            className="text-lg font-semibold cursor-pointer hover:underline"
                            onClick={handleUsernameClick}
                        >
                            {image.username}
                        </p>
                        <span className="text-sm text-gray-500">
                            {image.createdAt ? formatRelativeTime(image.createdAt) : ''}
                        </span>
                    </div>
                    {canDelete && <DeleteButtonWithConfirm onDelete={handleDelete} />}
                </div>
                <div className="flex flex-row items-stretch pt-1">
                    <div className='flex flex-1 flex-col'>
                        {bestVariant?.url && (
                            <img
                                src={bestVariant.url}
                                alt={image.alt || "Image"}
                                className="rounded mt-2 object-cover"
                            />
                        )}
                        <ContentInteractions
                            itemId={image.id}
                            itemType="Image"
                            initialLiked={image.likedByCurrentUser}
                            initialLikeCount={image.likes?.length || 0}
                            initialCommentCount={image.commentCount || 0}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

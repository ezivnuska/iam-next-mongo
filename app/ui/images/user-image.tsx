// app/ui/images/user-image.tsx

"use client";

import { formatRelativeTime } from "@/app/lib/utils/format-date";
import { useUser } from "@/app/lib/providers/user-provider";
import type { Image } from "@/app/lib/definitions/image";
import FlagContentButton from "../flag-content-button";
import UserAvatar from "../user/user-avatar";
import DeleteButtonWithConfirm from "../delete-button-with-confirm";
import ContentInteractions from "../content-interactions";
import { getBestVariant, IMAGE_SIZES } from "@/app/lib/utils/images";
import { useUserNavigation } from "@/app/lib/hooks/use-user-navigation";
import { useContentPermissions } from "@/app/lib/hooks/use-content-permissions";
import { useContentDelete } from "@/app/lib/hooks/use-content-delete";

interface UserImageProps {
    image: Image;
    onDeleted: (imageId: string) => void;
    onImageClick?: (image: Image) => void;
}

export default function UserImage({ image, onDeleted, onImageClick }: UserImageProps) {
    const { user } = useUser();
    const { navigateToUser } = useUserNavigation();
    const { canDelete } = useContentPermissions(image.userId || '');
    const handleDelete = useContentDelete('images', onDeleted);
    const bestVariant = getBestVariant(image, IMAGE_SIZES.CONTENT);

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
                            onClick={() => navigateToUser(image.username)}
                        >
                            {image.username}
                        </p>
                        <span className="text-sm text-gray-500">
                            {image.createdAt ? formatRelativeTime(image.createdAt) : ''}
                        </span>
                    </div>
                    {canDelete && <DeleteButtonWithConfirm onDelete={() => handleDelete(image.id)} />}
                </div>
                <div className="flex flex-row items-stretch pt-1">
                    <div className='flex flex-1 flex-col'>
                        {bestVariant?.url && (
                            <img
                                src={bestVariant.url}
                                alt={image.alt || "Image"}
                                className={`rounded mt-2 object-cover ${onImageClick ? 'cursor-pointer' : ''}`}
                                onClick={onImageClick ? () => onImageClick(image) : undefined}
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

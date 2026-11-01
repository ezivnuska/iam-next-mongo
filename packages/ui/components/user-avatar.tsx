'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { Image as ImageType } from '@iam/shared-types';
import { ComputerDesktopIcon } from '@heroicons/react/24/solid';
import { getBestVariant } from '@iam/shared-types';

interface UserAvatarProps {
    username: string;
    avatar?: ImageType | null;
    avatarUrl?: string;
    size?: number;
    className?: string;
    isAI?: boolean;
}

export default function UserAvatar({
    username,
    avatar,
    avatarUrl,
    size = 20,
    className = '',
    isAI = false,
}: UserAvatarProps) {
    const [fetchedAvatar, setFetchedAvatar] = useState<ImageType | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!avatar && !avatarUrl && username && !fetchedAvatar) {
            setLoading(true);
            fetch(`/api/users/${username}/avatar`)
                .then(res => res.ok ? res.json() : null)
                .then(data => {
                    if (data?.avatar) setFetchedAvatar(data.avatar);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        }
    }, [username, avatar, avatarUrl, fetchedAvatar]);

    const avatarToUse = avatar || fetchedAvatar;
    let imageUrl = avatarUrl;

    if (!imageUrl && avatarToUse) {
        imageUrl = getBestVariant(avatarToUse, size)?.url;
    }

    const validImageUrl = imageUrl && imageUrl !== 'null' && imageUrl !== 'undefined' ? imageUrl : null;

    return (
        <div className={`flex flex-row items-center justify-center w-full h-full rounded-full bg-gray-400 text-gray-600 font-semibold border-2 border-white ${className}`}>
            {isAI
                ? <ComputerDesktopIcon className="w-4 h-4 text-white" />
                : validImageUrl
                    ? (
                        <Image
                            src={validImageUrl}
                            alt={username}
                            width={size}
                            height={size}
                            className="w-full h-full object-cover rounded-full overflow-hidden"
                        />
                    )
                    : <p className="text-[16px] text-white">{username?.[0]?.toUpperCase() || '?'}</p>
            }
        </div>
    );
}

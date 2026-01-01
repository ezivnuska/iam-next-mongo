// app/ui/set-avatar-button.tsx

"use client";

import { useState } from "react";
import { Button } from '@/app/ui/button'
import { setAvatar } from "@/app/lib/actions/profile";
import { useUser } from "@/app/lib/providers/user-provider";
import { UserCircleIcon } from "@heroicons/react/20/solid";

interface AvatarButtonProps {
    imageId: string;
    isAvatar: boolean;
    onAvatarChange?: (newAvatarId: string | null) => void;
}

export default function AvatarButton({ imageId, isAvatar, onAvatarChange }: AvatarButtonProps) {
    const [loading, setLoading] = useState(false);
    const { setUser } = useUser();

    const handleChange = async () => {
        setLoading(true);
        try {
            const newAvatarId = isAvatar ? null : imageId;
            const res = await setAvatar(newAvatarId);
            if (!res.success || !res.user) throw new Error("Failed to update avatar");

            setUser(res.user);
            onAvatarChange?.(newAvatarId);
        } catch (err) {
            console.error(err);
            alert("Failed to update avatar");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            size='sm'
            onClick={handleChange}
            disabled={loading}
            variant={isAvatar ? 'active' : 'outline'}
        >
            <UserCircleIcon
                className="w-5 h-5"
                strokeWidth={2}
            />
        </Button>
    );
}

// app/ui/set-avatar-button.tsx

"use client";

import { useState } from "react";
import { Button } from '@/app/ui/button'
import { setAvatar } from "@/app/lib/actions/profile";
import { useUser } from "@/app/lib/providers/user-provider";

interface AvatarButtonProps {
    imageId: string;
    isAvatar: boolean;
}

export default function AvatarButton({ imageId, isAvatar }: AvatarButtonProps) {
    const [loading, setLoading] = useState(false);
    const { setUser } = useUser();

    const handleChange = async () => {

        setLoading(true);
        try {
            const res = await setAvatar(isAvatar ? null : imageId)
            if (!res.success || !res.user) throw new Error("Failed to update avatar");
            
            setUser(res.user);
        } catch (err) {
            console.error(err);
            alert("Failed to update avatar");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            size="sm"
            disabled={loading}
            variant={isAvatar ? "default" : "secondary"}
            onClick={handleChange}
            className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs z-10 hover:bg-red-500"
        >
            {loading ? 'Loading...' : isAvatar ? "Unset Avatar" : "Set Avatar"}
        </Button>
    );
}

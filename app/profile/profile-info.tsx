// app/profile/profile-info.tsx

"use client";

import { useUser } from "@/app/lib/providers/user-provider";
import UserAvatar from "@/app/ui/user/user-avatar";
import BioForm from "./bio-form";

export default function ProfileInfo() {
    const { user } = useUser();
    return user && (
        <div className="flex mt-2">
            <div className="flex flex-1 flex-row flex-wrap gap-4">
                <UserAvatar
                    username={user.username}
                    avatar={user.avatar}
                    size={100}
                />
                <div className="flex flex-1 flex-col gap-1">
                    <h1 className="text-2xl font-bold mb-1">
                        {user.username}
                    </h1>
                    <BioForm />
                </div>
            </div>
        </div>
    )
}
// app/profile/profile-info.tsx

"use client";

import { useUser } from "../lib/providers/user-provider";
import Avatar from "../ui/avatar";

export default function ProfileInfo() {
    const { user } = useUser();
    return user && (
        <div className="mt-4">
            <div>
                <Avatar
                    avatar={user?.avatar}
                    size={100}
                />
                <h1 className="text-2xl font-bold mb-2">
                    {user.username}
                </h1>
            </div>
            <p>Email: {user.email}</p>
            <p>ID: {user.id}</p>
        </div>
    )
}
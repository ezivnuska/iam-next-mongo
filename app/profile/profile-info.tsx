// app/profile/profile-info.tsx

"use client";

import { useUser } from "../lib/providers/user-provider";
import Avatar from "../ui/avatar";

export default function ProfileInfo() {
    const { user } = useUser();
    return user && (
        <div className="mt-2">
            <div className='flex flex-row flex-wrap gap-4'>
                <Avatar
                    avatar={user?.avatar}
                    size={100}
                    className='h-[100px] mb-2'
                />
                <div className='flex flex-col gap-1'>
                    <h1 className="text-2xl font-bold mb-1">
                        {user.username}
                    </h1>
                    <p>Email: {user.email}</p>
                    <p>ID: {user.id}</p>
                </div>
            </div>
        </div>
    )
}
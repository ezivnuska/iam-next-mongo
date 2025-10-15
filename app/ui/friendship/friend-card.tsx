// app/ui/friendship/friend-card.tsx

'use client';

import UserAvatar from '@/app/ui/user/user-avatar';
import { Button } from '@/app/ui/button';

interface FriendCardProps {
    id: string;
    username: string;
    avatarUrl?: string;
    subtitle: string;
    actions?: React.ReactNode;
}

export default function FriendCard({ id, username, avatarUrl, subtitle, actions }: FriendCardProps) {
    return (
        <div key={id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
                <UserAvatar
                    username={username}
                    avatarUrl={avatarUrl}
                    size={40}
                />
                <div>
                    <p className="font-semibold text-sm">{username}</p>
                    <p className="text-xs text-gray-500">{subtitle}</p>
                </div>
            </div>
            {actions && <div className="flex gap-2">{actions}</div>}
        </div>
    );
}

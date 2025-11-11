// app/ui/user-profile-card.tsx

"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@/app/lib/providers/user-provider";
import UserAvatar from "@/app/ui/user/user-avatar";
import BioForm from "@/app/profile/bio-form";
import type { User } from "@/app/lib/definitions";
import { PowerIcon } from "@heroicons/react/24/solid";

interface UserProfileCardProps {
  username?: string;
}

export default function UserProfileCard({ username }: UserProfileCardProps) {
  const { user: currentUser, fetchUserByUsername, signOut } = useUser();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  // Determine if we're showing the current user's profile or another user's
  const isCurrentUser = !username || username === currentUser?.username;
  const displayUser = isCurrentUser ? currentUser : profileUser;

    const pathname = usePathname();
    const [isSigningOut, setIsSigningOut] = useState(false);
  
    const handleSignOut = async () => {
      setIsSigningOut(true);
      try {
        await signOut(); // UserProvider handles clearing state + next-auth
      } finally {
        setIsSigningOut(false);
      }
    };

  useEffect(() => {
    // If showing current user, no need to fetch
    if (isCurrentUser) return;

    let mounted = true;

    async function loadUser() {
      if (!username) return;

      setLoading(true);
      try {
        const profile = await fetchUserByUsername(username);
        if (mounted) setProfileUser(profile);
      } catch (err) {
        console.error("Failed to fetch user profile:", err);
        if (mounted) setProfileUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadUser();
    return () => { mounted = false; };
  }, [username, isCurrentUser, fetchUserByUsername]);

  if (loading) return <p>Loading...</p>;
  if (!displayUser) return <p>User not found</p>;

  return (
    <div className="flex mt-2">
      <div className="flex flex-1 flex-row flex-wrap gap-4">
        <UserAvatar
          username={displayUser.username}
          avatar={displayUser.avatar}
          size={100}
        />
        <div className="flex flex-1 flex-col gap-1">
            <div className="flex flex-row items-center justify-between">
                <h1 className="text-2xl font-bold mb-1">
                    {displayUser.username}
                </h1>

                <button
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className={`flex items-center gap-2 self-start cursor-pointer rounded-lg px-3 py-2 m-1 text-sm font-medium text-white transition-colors md:text-base ${
                        isSigningOut
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-500 hover:bg-blue-400"
                    }`}
                    >
                    <PowerIcon className="w-5" />
                    <p className="hidden min-[376px]:block">
                        {isSigningOut ? "Signing Out..." : "Sign Out"}
                    </p>
                </button>
            </div>

            {isCurrentUser ? (
                <BioForm />
            ) : (
                <div className="mb-2">
                <h2 className="text-lg font-semibold mb-2">Bio</h2>
                <p className="text-gray-700">
                    {displayUser.bio || "No bio yet."}
                </p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}

// app/ui/user-profile-card.tsx

"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/app/lib/providers/user-provider";
import type { User } from "@/app/lib/definitions";

interface UserProfileCardProps {
  username: string;
}

export default function UserProfileCard({ username }: UserProfileCardProps) {
  const { fetchUserByUsername } = useUser();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      setLoading(true);
      try {
        const profile = await fetchUserByUsername(username);
        if (mounted) setUser(profile);
      } catch (err) {
        console.error("Failed to fetch user profile:", err);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadUser();
    return () => { mounted = false; };
  }, [username, fetchUserByUsername]);

  if (loading) return <p>Loading...</p>;
  if (!user) return <p>User not found</p>;

  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h2 className="text-xl font-bold">{user.username}</h2>
      <p>Email: {user.email}</p>
      <p>Role: {user.role}</p>
      {user.avatar && user.avatar.variants?.[0]?.url && (
        <img
          src={user.avatar.variants[0].url}
          alt={`${user.username}'s avatar`}
          className="w-20 h-20 rounded-full object-cover mt-2"
        />
      )}
      <p>Joined: {new Date(user.createdAt).toLocaleDateString()}</p>
    </div>
  );
}

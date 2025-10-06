// app/lib/providers/user-provider.tsx

"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { signIn as nextSignIn, signOut as nextSignOut } from "next-auth/react";
import type { AppUser, User } from "@/app/lib/definitions";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface UserContextValue {
  user: User | null;
  status: AuthStatus;
  setUser: (u: User | null) => void;
  signIn: typeof nextSignIn;
  signOut: () => Promise<void>;
  fetchUserById: (id: string) => Promise<User | null>;
  fetchUserByUsername: (username: string) => Promise<User | null>;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

interface UserProviderProps {
  children: React.ReactNode;
  initialUser: AppUser | null;
}

export function UserProvider({ children, initialUser }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  // Cached user profiles
  const [userCache] = useState<Map<string, User>>(new Map());

  useEffect(() => {
    async function fetchFullUser() {
      if (!initialUser) {
        setUser(null);
        setStatus("unauthenticated");
        return;
      }
  
      setStatus("loading");
      try {
        const res = await fetch("/api/users/me");
        if (!res.ok) {
          setUser(null);
          setStatus("unauthenticated");
          return;
        }
        const fullUser: User = await res.json();
        setUser(fullUser);
        setStatus("authenticated");
      } catch (err) {
        console.error("Failed to fetch full user:", err);
        setUser(null);
        setStatus("unauthenticated");
      }
    }
  
    fetchFullUser();
  }, [initialUser]);

  async function fetchUserById(id: string): Promise<User | null> {
    if (userCache.has(id)) return userCache.get(id)!;

    try {
      const res = await fetch(`/api/users/${id}`);
      if (!res.ok) throw new Error("Failed to fetch user profile");
      const data: User = await res.json();
      userCache.set(id, data);
      return data;
    } catch (err) {
      console.error("fetchUserById error:", err);
      return null;
    }
  }

  async function fetchUserByUsername(username: string): Promise<User | null> {
    if (userCache.has(username)) return userCache.get(username)!;
  
    try {
      const res = await fetch(`/api/users/${username}`);
      if (!res.ok) throw new Error(`Failed to fetch user profile (username: ${username})`);
  
      const data: User = await res.json();
      userCache.set(username, data);
      return data;
    } catch (err) {
      console.error("fetchUserByUsername error:", err);
      return null;
    }
  }  

  async function signOut() {
      setUser(null);
      setStatus("unauthenticated");
      await nextSignOut({ redirect: true, callbackUrl: '/' });
  }

  return (
    <UserContext.Provider
      value={{
        user,
        status,
        setUser,
        signIn: nextSignIn,
        signOut,
        fetchUserById,
        fetchUserByUsername,
      }}
    >
      {status === 'loading' ? null : children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}

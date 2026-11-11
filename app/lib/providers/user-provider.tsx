// app/lib/providers/user-provider.tsx

"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { signIn as nextSignIn, signOut as nextSignOut } from "next-auth/react";
import type { AppUser, User } from "@/app/lib/definitions";

type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "signing-out";

interface UserContextValue {
    user: User | null;
    status: AuthStatus;
    setUser: (u: User | null) => void;
    signIn: typeof nextSignIn;
    signOut: () => Promise<void>;
    fetchUserByUsername: (username: string) => Promise<User | null>;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

interface UserProviderProps {
    children: React.ReactNode;
    initialUser: AppUser | null;
}

function partialUser(session: AppUser): User {
    return {
        id: session.id,
        username: session.username,
        email: session.email,
        role: session.role,
        emailVerified: session.emailVerified ?? null,
        bio: '',
        avatar: null,
        verified: false,
        createdAt: '',
        updatedAt: '',
    };
}

export function UserProvider({ children, initialUser }: UserProviderProps) {
    const [user, setUser] = useState<User | null>(initialUser ? partialUser(initialUser) : null);
    const [status, setStatus] = useState<AuthStatus>(initialUser ? "authenticated" : "unauthenticated");

    const [usernameCache] = useState<Map<string, User>>(new Map());

    useEffect(() => {
        if (!initialUser) {
            setUser(null);
            setStatus("unauthenticated");
            return;
        }

        // Set partial data immediately so UI stays visible, hydrate in background.
        setUser(partialUser(initialUser));
        setStatus("authenticated");

        fetch("/api/users/me")
            .then(res => res.ok ? res.json() : Promise.reject(new Error('fetch failed')))
            .then((fullUser: User) => {
                setUser(fullUser);
            })
            .catch(err => {
                console.error("Failed to fetch full user:", err);
                setUser(null);
                setStatus("unauthenticated");
            });
    }, [initialUser]);

    async function fetchUserByUsername(username: string): Promise<User | null> {
        if (usernameCache.has(username)) return usernameCache.get(username)!;

        try {
            const res = await fetch(`/api/users/${username}`);
            if (!res.ok) throw new Error(`Failed to fetch user profile (username: ${username})`);

            const data: User = await res.json();
            usernameCache.set(username, data);
            return data;
        } catch (err) {
            console.error("fetchUserByUsername error:", err);
            return null;
        }
    }

    async function signOut() {
        setStatus("signing-out");
        await nextSignOut({ redirect: false });
        window.location.href = '/';
    }

    return (
        <UserContext.Provider
            value={{
                user,
                status,
                setUser,
                signIn: nextSignIn,
                signOut,
                fetchUserByUsername,
            }}
        >
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const ctx = useContext(UserContext);
    if (!ctx) throw new Error("useUser must be used within UserProvider");
    return ctx;
}

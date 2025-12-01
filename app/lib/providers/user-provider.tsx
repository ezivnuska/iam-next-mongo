// app/lib/providers/user-provider.tsx

"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { signIn as nextSignIn, signOut as nextSignOut } from "next-auth/react";
import type { AppUser, User } from "@/app/lib/definitions";
import { UserRole } from "@/app/lib/definitions/user";

type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "signing-out";

/**
 * Creates a guest user object for unauthenticated users
 *
 * IMPORTANT: Guest User Pattern Rationale
 *
 * This application uses a guest user object (instead of null) for unauthenticated users
 * to support the poker game feature, which allows anonymous users to play without creating an account.
 *
 * Why guest users are NOT just `null`:
 *
 * 1. **Poker Game Requirements**:
 *    - Guest users can join poker games by providing only a username
 *    - The game needs a consistent user object to track players across socket events
 *    - Guest IDs transition from 'guest-pending' → 'guest-{uuid}' when joining a game
 *    - Socket synchronization matches guests by username: `player.username === user.username`
 *
 * 2. **State Management**:
 *    - All poker components expect `user` to be an object, never null
 *    - Client-side logic uses `user?.id`, `user?.username`, `user?.isGuest` throughout
 *    - Socket handlers update guest IDs via object spreading: `{...prevUser, id: newGuestId}`
 *    - If `user` were `null`, 26+ locations across 8 poker files would break
 *
 * 3. **Consistent API**:
 *    - Components can safely access `user.id` and `user.username` without extensive null checks
 *    - The `isGuest: true` flag clearly distinguishes guest vs authenticated users
 *    - Guest users are filtered out of balance persistence: `if (!isGuestId(player.id)) { saveBalance() }`
 *
 * 4. **Security Considerations**:
 *    - Protected routes (profile, activity, users) use middleware + server-side checks
 *    - Server actions and API routes validate authentication via `requireAuth()`
 *    - Guest users can ONLY access public content and the poker game
 *    - Guest user balances are ephemeral (not persisted to database)
 *
 * For protected routes that should NOT allow guest access, check:
 * - `if (!user || user.isGuest)` on the client
 * - `await requireAuth()` throws "Unauthorized" for guest users on the server
 *
 * @returns User object with isGuest: true and temporary ID 'guest-pending'
 */
function createGuestUser(): User {
    return {
        id: 'guest-pending',        // Temporary ID - replaced when joining poker game
        username: 'Guest',          // Default display name - replaced when joining poker game
        email: '',
        role: UserRole.User,
        bio: '',
        avatar: null,
        verified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isGuest: true,              // KEY: Identifies this as a guest (unauthenticated) user
    };
}

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
                // Create guest user object for unauthenticated users
                // Actual guest ID will be assigned server-side when joining a game
                setUser(createGuestUser());
                setStatus("unauthenticated");
                return;
            }

            setStatus("loading");
            try {
                const res = await fetch("/api/users/me");
                if (!res.ok) {
                    // Create guest user on failed authentication
                    setUser(createGuestUser());
                    setStatus("unauthenticated");
                    return;
                }
                const fullUser: User = await res.json();
                setUser(fullUser);
                setStatus("authenticated");
            } catch (err) {
                console.error("Failed to fetch full user:", err);
                // Create guest user on error
                setUser(createGuestUser());
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
        // Set signing-out status to prevent UI flash
        setStatus("signing-out");

        // Sign out from NextAuth without redirect, then manually redirect
        // This ensures the session is fully cleared before navigation
        await nextSignOut({ redirect: false });

        // Redirect immediately - don't clear state as it will cause UI flash
        // The state will be reset when the page reloads
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
                fetchUserById,
                fetchUserByUsername,
            }}
        >
            {["authenticated", "unauthenticated", "signing-out"].includes(status) ? children : null}
        </UserContext.Provider>
    );
}

export function useUser() {
    const ctx = useContext(UserContext);
    if (!ctx) throw new Error("useUser must be used within UserProvider");
    return ctx;
}

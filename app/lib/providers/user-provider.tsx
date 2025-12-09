// app/lib/providers/user-provider.tsx

"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { signIn as nextSignIn, signOut as nextSignOut } from "next-auth/react";
import type { AppUser, User } from "@/app/lib/definitions";
import { UserRole } from "@/app/lib/definitions/user";

type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "signing-out";

/**
 * Creates a guest user object for the poker game
 *
 * IMPORTANT: Guest User Pattern
 *
 * Guest users are ONLY created for the poker game, allowing anonymous users to play
 * without creating an account. For general site browsing, unauthenticated users are `null`.
 *
 * **Poker Game Requirements**:
 * - Guest users can join poker games by providing only a username
 * - Each guest gets a unique ID (guest-{uuid}) generated on creation
 * - Guest ID and username are persisted in localStorage for reconnection after refresh
 * - The game needs a consistent user object to track players across socket events
 *
 * **Security Considerations**:
 * - Protected routes (profile, activity, users) use middleware + server-side checks
 * - Server actions and API routes validate authentication via `requireAuth()`
 * - Guest users can ONLY access the poker game
 * - Guest user balances are ephemeral (not persisted to database)
 *
 * For protected routes that should NOT allow guest access, check:
 * - `if (!user)` on the client (guest users will be null outside poker game)
 * - `await requireAuth()` throws "Unauthorized" for guest users on the server
 *
 * @returns User object with isGuest: true and a unique guest ID
 */
export function createGuestUser(): User {
    // Import guest utils - use dynamic import to avoid issues in non-poker contexts
    const { generateGuestId } = require('@/app/poker/lib/utils/guest-utils');

    return {
        id: generateGuestId(),      // Unique guest ID generated immediately
        username: 'Guest',          // Default display name - updated when joining poker game
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
                // Unauthenticated users are null (guest users only created in poker game)
                setUser(null);
                setStatus("unauthenticated");
                return;
            }

            setStatus("loading");
            try {
                const res = await fetch("/api/users/me");
                if (!res.ok) {
                    // Failed authentication - set user to null
                    setUser(null);
                    setStatus("unauthenticated");
                    return;
                }
                const fullUser: User = await res.json();
                setUser(fullUser);
                setStatus("authenticated");

                // Clear guest credentials when user authenticates
                try {
                    localStorage.removeItem('poker_guest_id');
                    localStorage.removeItem('poker_guest_username');
                    localStorage.removeItem('poker_guest_created_at');
                } catch (e) {
                    console.warn('Failed to clear guest credentials on authentication:', e);
                }
            } catch (err) {
                console.error("Failed to fetch full user:", err);
                // Error fetching user - set user to null
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

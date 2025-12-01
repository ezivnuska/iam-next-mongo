// app/ui/user/sign-out-button.tsx

"use client";

import { useUser } from "@/app/lib/providers/user-provider";
import { Button } from "../button";

export default function SignOutButton() {
    const { status, signOut } = useUser();
    const isSigningOut = status === 'signing-out';

    const handleSignOut = async () => {
        await signOut(); // UserProvider handles clearing state + next-auth
    };

    return (
        <Button onClick={handleSignOut} variant="ghost" disabled={isSigningOut}>{`Sign${isSigningOut ? 'ing' : ''} Out`}</Button>
    );
}

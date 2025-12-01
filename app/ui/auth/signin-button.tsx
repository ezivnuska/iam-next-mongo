// app/ui/auth/signin-button.tsx

"use client";

import { useUser } from "@/app/lib/providers/user-provider";
import { useAuthModal } from "@/app/lib/providers/auth-modal-provider";
import { Button } from "../button";

export default function SigninButton() {
    const { status } = useUser();
    const { openAuthModal } = useAuthModal();

    if (['authenticated', 'loading', 'signing-out'].includes(status)) return null

    return (
        <Button
            onClick={() => openAuthModal('signin')}
            variant="link"
        >
            Sign In
        </Button>
    );
}

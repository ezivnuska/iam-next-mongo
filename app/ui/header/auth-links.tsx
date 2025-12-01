// app/ui/header/auth-links.tsx

"use client";

import { useUser } from "@/app/lib/providers/user-provider";
import { useAuthModal } from "@/app/lib/providers/auth-modal-provider";
import { Button } from "../button";

export default function AuthLinks() {
    const { status } = useUser();
    const { openAuthModal } = useAuthModal();

    return (
        <div className="flex w-full justify-end items-center gap-2">
            {(status === "authenticated" || status === "loading" || status === "signing-out")
                ? null
                : (
                    <Button
                        onClick={() => openAuthModal('signin')}
                        variant="link"
                    >
                        Sign In
                    </Button>
                )
            }
        </div>
    );
}

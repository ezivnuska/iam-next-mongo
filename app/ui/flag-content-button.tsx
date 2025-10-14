// app/ui/flag-content-button.tsx

"use client";

import { Button } from "@/app/ui/button";
import { FlagIcon } from "@heroicons/react/24/outline";

interface FlagContentButtonProps {
    onFlag: () => void;
}

export default function FlagContentButton({ onFlag }: FlagContentButtonProps) {
    return (
        <Button
            size='sm'
            onClick={onFlag}
            variant="warn"
        >
            <FlagIcon className="w-5 h-5" />
        </Button>
    );
}

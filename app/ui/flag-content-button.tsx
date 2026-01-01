// app/ui/flag-content-button.tsx

"use client";

import { Button } from "@/app/ui/button";
import { FlagIcon } from "@heroicons/react/24/solid";

interface FlagContentButtonProps {
    onFlag: () => void;
}

export default function FlagContentButton({ onFlag }: FlagContentButtonProps) {
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        onFlag();
    };

    return (
        <Button
            size='sm'
            onClick={handleClick}
            variant="warn"
        >
            <FlagIcon className="w-5 h-5" />
        </Button>
    );
}

// app/ui/avatar.tsx

"use client";

import type { Image } from "@/app/lib/definitions";

interface AvatarProps {
  avatar: Image | null;
  size?: number;
  className?: string;
}

export default function Avatar({ avatar, size = 40, className }: AvatarProps) {
  if (!avatar || !avatar.variants?.length) {
    return (
      <div
        className={`bg-gray-300 rounded-full ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  const bestVariant = avatar.variants.reduce((closest, current) => {
    if (!current.width) return closest;
    return Math.abs(current.width - size) < Math.abs((closest.width ?? 0) - size)
      ? current
      : closest;
  }, avatar.variants[0]);

  return (
        <img
            src={bestVariant.url}
            alt="User Avatar"
            className={`rounded-full border-1 h-[${size}] ${className}`}
            width={size}
            height={size}
        />
  );
}

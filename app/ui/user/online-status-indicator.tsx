// app/ui/user/online-status-indicator.tsx

"use client";

interface OnlineStatusIndicatorProps {
  isOnline: boolean;
  size?: number;
}

export default function OnlineStatusIndicator({ isOnline, size = 10 }: OnlineStatusIndicatorProps) {
  if (!isOnline) return null;

  return (
    <div
      className="rounded-full bg-green-500 border-2 border-white"
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
      title="Online"
    />
  );
}

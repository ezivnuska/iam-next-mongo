// app/ui/icons.tsx

type IconProps = {
	className?: string
	strokeWidth?: number
}

export function HeartIcon({ className = 'w-5 h-5', strokeWidth = 2 }: IconProps) {
	return (
		<svg
			className={className}
			stroke="currentColor"
			fill="currentColor"
			viewBox="0 0 24 24"
			strokeWidth={strokeWidth}
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
			/>
		</svg>
	)
}

export function CommentIcon({ className = 'w-5 h-5', strokeWidth = 2 }: IconProps) {
	return (
		<svg
			className={className}
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			strokeWidth={strokeWidth}
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
			/>
		</svg>
	)
}

export function ChevronUpIcon({ className = 'w-5 h-5', strokeWidth = 2 }: IconProps) {
	return (
		<svg
			className={className}
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			strokeWidth={strokeWidth}
		>
			<path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
		</svg>
	)
}

export function ChevronDownIcon({ className = 'w-5 h-5', strokeWidth = 2 }: IconProps) {
	return (
		<svg
			className={className}
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			strokeWidth={strokeWidth}
		>
			<path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
		</svg>
	)
}

export function ChevronLeftIcon({ className = 'w-5 h-5', strokeWidth = 2 }: IconProps) {
	return (
		<svg
			className={className}
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			strokeWidth={strokeWidth}
		>
			<path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
		</svg>
	)
}

export function TrashIcon({ className = 'w-5 h-5', strokeWidth = 2 }: IconProps) {
	return (
		<svg
			className={className}
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			strokeWidth={strokeWidth}
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
			/>
		</svg>
	)
}

export function CloseIcon({ className = 'text-2xl leading-none' }: { className?: string }) {
	return <span className={className}>✕</span>
}

// app/ui/like-button.tsx

'use client'

import { useOptimisticMutation } from '@/app/lib/hooks/use-optimistic-mutation'
import { toggleLike } from '@/app/lib/actions/likes'
import { HeartIcon } from '@/app/ui/icons'

type LikeButtonProps = {
	itemId: string
	itemType: 'Image' | 'Post' | 'Memory'
	initialLiked?: boolean
	initialLikeCount?: number
	variant?: 'default' | 'overlay'
	onLikeChange?: (newLiked: boolean, newCount: number) => void
}

type LikeState = {
	liked: boolean
	likeCount: number
}

export default function LikeButton({
	itemId,
	itemType,
	initialLiked = false,
	initialLikeCount = 0,
	variant = 'default',
	onLikeChange,
}: LikeButtonProps) {
	const { data, isLoading, mutate } = useOptimisticMutation<LikeState>({
		liked: initialLiked,
		likeCount: initialLikeCount,
	})

	const handleToggleLike = async (e: React.MouseEvent) => {
		e.stopPropagation()

		if (isLoading) return

		const newLiked = !data.liked
		const newCount = newLiked ? data.likeCount + 1 : data.likeCount - 1

		await mutate(
			{ liked: newLiked, likeCount: newCount },
			async () => {
				const result = await toggleLike(itemId, itemType)
				// Notify parent of the change
				onLikeChange?.(result.liked, result.likeCount)
				return { liked: result.liked, likeCount: result.likeCount }
			}
		)
	}

	const baseClasses = "my-1 flex items-center gap-1 cursor-pointer hover:bg-gray-200 rounded transition-all"
	const variantClasses = variant === 'overlay'
		? "bg-white bg-opacity-90 rounded-full px-3 py-2 shadow-lg hover:bg-opacity-100"
		: "px-1 py-2 rounded-lg hover:bg-gray-100"

	return (
		<button
			onClick={handleToggleLike}
			disabled={isLoading}
			className={`${baseClasses} ${variantClasses} disabled:opacity-50`}
			aria-label={data.liked ? 'Unlike' : 'Like'}
		>
			<HeartIcon
				className={`w-5 h-5 transition-colors ${
					data.liked ? 'fill-red-500 text-red-500' : 'fill-none text-gray-600'
				}`}
				strokeWidth={2}
			/>
			{data.likeCount > 0 && (
				<span className={`text-sm font-medium ${data.liked ? 'text-red-500' : 'text-gray-700'}`}>
					{data.likeCount}
				</span>
			)}
		</button>
	)
}

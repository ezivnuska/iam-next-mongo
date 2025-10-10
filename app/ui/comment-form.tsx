// app/ui/comment-form.tsx

'use client'

import { useState } from 'react'

type CommentFormProps = {
	refId: string
	refType: 'Memory' | 'Post' | 'Image'
	onSubmit?: (content: string) => void | Promise<void>
	placeholder?: string
	submitButtonText?: string
}

export default function CommentForm({
	refId,
	refType,
	onSubmit,
	placeholder = 'Write a comment...',
	submitButtonText = 'Post',
}: CommentFormProps) {
	const [content, setContent] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!content.trim()) return

		setIsSubmitting(true)
		try {
			if (onSubmit) {
				await onSubmit(content)
			}
			setContent('')
		} catch (error) {
			console.error('Error submitting comment:', error)
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<form onSubmit={handleSubmit} className="w-full">
			<div className="flex gap-2">
				<textarea
					value={content}
					onChange={(e) => setContent(e.target.value)}
					placeholder={placeholder}
					disabled={isSubmitting}
					className="flex-1 min-h-[80px] px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
					rows={3}
				/>
			</div>
			<div className="mt-2 flex justify-end">
				<button
					type="submit"
					disabled={isSubmitting || !content.trim()}
					className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
				>
					{isSubmitting ? 'Posting...' : submitButtonText}
				</button>
			</div>
		</form>
	)
}

// app/ui/comment-form.tsx

'use client'

import { useState } from 'react'
import type { CommentRefType } from '@/app/lib/definitions/comment'

type CommentFormProps = {
	refId: string
	refType: CommentRefType
	onSubmit?: (content: string) => void | Promise<void>
	onError?: (error: Error) => void
	placeholder?: string
	submitButtonText?: string
}

export default function CommentForm({
	refId,
	refType,
	onSubmit,
	onError,
	placeholder = 'Write a comment...',
	submitButtonText = 'Post',
}: CommentFormProps) {
	const [content, setContent] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!content.trim()) return

		setIsSubmitting(true)
		setError(null)
		try {
			if (onSubmit) {
				await onSubmit(content)
			}
			setContent('')
		} catch (err) {
			const error = err instanceof Error ? err : new Error('Failed to submit comment')
			console.error('Error submitting comment:', error)
			setError(error.message)
			onError?.(error)
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<form onSubmit={handleSubmit} className="w-full">
			{error && (
				<div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
					{error}
				</div>
			)}
			<div className="flex gap-2">
				<textarea
					value={content}
					onChange={(e) => setContent(e.target.value)}
					placeholder={placeholder}
					disabled={isSubmitting}
					className="flex-1 min-h-[80px] px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed placeholder:text-gray-500 dark:placeholder:text-gray-400"
					rows={3}
				/>
			</div>
			<div className="mt-2 flex justify-end">
				<button
					type="submit"
					disabled={isSubmitting || !content.trim()}
					className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
				>
					{isSubmitting ? 'Posting...' : submitButtonText}
				</button>
			</div>
		</form>
	)
}

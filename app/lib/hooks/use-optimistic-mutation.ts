// app/lib/hooks/use-optimistic-mutation.ts

'use client'

import { useState, useCallback } from 'react'

type OptimisticMutationResult<T> = {
	data: T
	isLoading: boolean
	error: Error | null
	mutate: (optimisticValue: T, action: () => Promise<T>) => Promise<T | undefined>
	setData: (value: T | ((prev: T) => T)) => void
}

export function useOptimisticMutation<T>(
	initialValue: T
): OptimisticMutationResult<T> {
	const [data, setData] = useState<T>(initialValue)
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<Error | null>(null)

	const mutate = useCallback(
		async (optimisticValue: T, action: () => Promise<T>): Promise<T | undefined> => {
			const previousValue = data
			setData(optimisticValue)
			setIsLoading(true)
			setError(null)

			try {
				const result = await action()
				setData(result)
				return result
			} catch (err) {
				setData(previousValue)
				const error = err instanceof Error ? err : new Error('An error occurred')
				setError(error)
				console.error('Optimistic mutation failed:', error)
				return undefined
			} finally {
				setIsLoading(false)
			}
		},
		[data]
	)

	return { data, isLoading, error, mutate, setData }
}

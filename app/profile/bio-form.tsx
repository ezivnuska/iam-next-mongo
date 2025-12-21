// app/profile/bio-form.tsx

'use client';

import { useState } from 'react';
import { updateBio } from '@/app/lib/actions/profile';
import { useUser } from '@/app/lib/providers/user-provider';
import { PencilSquareIcon } from '@heroicons/react/24/solid';

export default function BioForm() {
    const { user, setUser } = useUser();
    const [bio, setBio] = useState(user?.bio || '');
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const result = await updateBio(bio);

            if (result.success && result.user) {
                setUser(result.user);
                setIsEditing(false);
            } else {
                setError(result.error || 'Failed to update bio');
            }
        } catch (err) {
            setError('An error occurred while updating bio');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setBio(user?.bio || '');
        setIsEditing(false);
        setError(null);
    };

    if (!isEditing) {
        return (
            <button
                onClick={() => setIsEditing(true)}
                className='text-sm text-blue-300 hover:text-blue-800'
            >
                {/* Edit */}
                <PencilSquareIcon className='w-6 h-6' />
            </button>
        );
    }

    return (
        <div className='mb-2'>
            <h2 className='text-lg font-semibold mb-2'>Edit Bio</h2>
            <form onSubmit={handleSubmit}>
                <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                    rows={4}
                    maxLength={500}
                    placeholder='Tell us about yourself...'
                />
                <div className='flex items-center justify-between mt-2'>
                    <span className='text-sm text-gray-500'>
                        {bio.length}/500
                    </span>
                    <div className='flex gap-2'>
                        <button
                            type='submit'
                            disabled={isLoading}
                            className='px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50'
                        >
                            {isLoading ? 'Saving...' : 'Save'}
                        </button>
                        <button
                            type='button'
                            onClick={handleCancel}
                            disabled={isLoading}
                            className='px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50'
                        >
                            Cancel
                        </button>
                    </div>
                </div>
                {error && (
                    <p className='mt-2 text-sm text-red-600'>{error}</p>
                )}
            </form>
        </div>
    );
}

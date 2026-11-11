'use client';

import { useState } from 'react';
import { useUser } from '@/app/lib/providers/user-provider';
import { deleteAccount } from '@/app/lib/actions/account';

export default function DeleteAccountSection() {
    const { user, signOut } = useUser();
    const [confirming, setConfirming] = useState(false);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const username = user?.username ?? '';
    const confirmed = input === username;

    const handleDelete = async () => {
        if (!confirmed) return;
        setLoading(true);
        setError('');
        try {
            await deleteAccount();
            await signOut();
        } catch (e: any) {
            setError(e?.message ?? 'Something went wrong.');
            setLoading(false);
        }
    };

    if (!confirming) {
        return (
            <div className='flex flex-col gap-2'>
                <p className='text-sm text-gray-600'>Permanently deletes your account and all associated content.</p>
                <button
                    onClick={() => setConfirming(true)}
                    className='self-start px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors'
                >
                    Delete account
                </button>
            </div>
        );
    }

    return (
        <div className='flex flex-col gap-3'>
            <p className='text-sm text-gray-700'>
                This cannot be undone. All your posts, memories, images, and account data will be permanently deleted.
            </p>
            <p className='text-sm text-gray-700'>
                Type <span className='font-mono font-semibold'>{username}</span> to confirm.
            </p>
            <input
                type='text'
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={username}
                className='w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300'
                disabled={loading}
                autoFocus
            />
            {error && <p className='text-sm text-red-600'>{error}</p>}
            <div className='flex gap-2'>
                <button
                    onClick={handleDelete}
                    disabled={!confirmed || loading}
                    className='px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
                >
                    {loading ? 'Deleting…' : 'Permanently delete'}
                </button>
                <button
                    onClick={() => { setConfirming(false); setInput(''); }}
                    disabled={loading}
                    className='px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors'
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}

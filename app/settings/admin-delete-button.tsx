'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@iam/ui';
import { useModal } from '@/app/lib/hooks/use-modal';
import { useUser } from '@/app/lib/providers/user-provider';
import { adminDeleteAccount } from '@/app/lib/actions/account';

interface AdminDeleteButtonProps {
    userId: string;
    username: string;
}

function XIcon({ className }: { className?: string }) {
    return (
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3' strokeLinecap='round' className={className}>
            <line x1='5' y1='5' x2='19' y2='19' />
            <line x1='19' y1='5' x2='5' y2='19' />
        </svg>
    );
}

export default function AdminDeleteButton({ userId, username }: AdminDeleteButtonProps) {
    const router = useRouter();
    const { user } = useUser();
    const { isOpen, open, close } = useModal();
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const confirmed = input === username;

    const handleDelete = async () => {
        if (!confirmed) return;
        setLoading(true);
        setError('');
        try {
            await adminDeleteAccount(userId);
            close();
            router.push(`/users/${user?.username}?t=friends`);
        } catch (e: any) {
            setError(e?.message ?? 'Something went wrong.');
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (loading) return;
        setInput('');
        setError('');
        close();
    };

    return (
        <>
            <button
                onClick={open}
                title='Delete account (admin)'
                className='flex items-center justify-center w-8 h-8 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors'
            >
                <XIcon className='w-5 h-5' />
            </button>

            <Modal isOpen={isOpen} onClose={handleClose}>
                <div className='flex flex-col gap-3 p-4'>
                    <h2 className='text-base font-semibold text-gray-900'>Delete account</h2>
                    <p className='text-sm text-gray-700'>
                        Permanently delete <span className='font-semibold'>{username}</span>'s account and all associated content. This cannot be undone.
                    </p>
                    <p className='text-sm text-gray-700'>
                        Type <span className='font-mono font-semibold'>{username}</span> to confirm.
                    </p>
                    <input
                        type='text'
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder={username}
                        className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300'
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
                            onClick={handleClose}
                            disabled={loading}
                            className='px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors'
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

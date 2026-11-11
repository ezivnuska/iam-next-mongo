// app/ui/find-or-invite-form.tsx

'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { searchUserByEmail } from '@/app/lib/actions/users';
import { sendInviteAction } from '@/app/lib/actions/invitations';

type PublicUser = { id: string; username: string; bio?: string };

type State =
    | { kind: 'idle' }
    | { kind: 'found'; user: PublicUser }
    | { kind: 'not-found'; email: string }
    | { kind: 'invited'; email: string }
    | { kind: 'error'; message: string };

export default function FindOrInviteForm() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [state, setState] = useState<State>({ kind: 'idle' });

    const handleSearch = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const user = await searchUserByEmail(email);
            if (user) setState({ kind: 'found', user });
            else setState({ kind: 'not-found', email });
        } catch {
            setState({ kind: 'error', message: 'Something went wrong. Try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async () => {
        if (state.kind !== 'not-found') return;
        setLoading(true);
        try {
            await sendInviteAction(state.email);
            setState({ kind: 'invited', email: state.email });
        } catch {
            setState({ kind: 'error', message: 'Failed to send invitation.' });
        } finally {
            setLoading(false);
        }
    };

    const reset = () => { setState({ kind: 'idle' }); setEmail(''); };

    return (
        <div className='px-4 py-4 max-w-sm'>
            <form onSubmit={handleSearch} className='flex gap-2'>
                <input
                    type='email'
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder='Search by email'
                    className='flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300'
                    required
                    disabled={loading}
                />
                <button
                    type='submit'
                    disabled={loading}
                    className='px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg disabled:opacity-50'
                >
                    {loading ? '…' : 'Search'}
                </button>
            </form>

            {state.kind === 'found' && (
                <div className='mt-3 flex items-center justify-between text-sm'>
                    <span className='text-gray-600'>Found: <Link href={`/users/${state.user.username}`} className='font-medium text-blue-600 hover:underline'>{state.user.username}</Link></span>
                    <button onClick={reset} className='text-xs text-gray-400 hover:text-gray-600'>Clear</button>
                </div>
            )}

            {state.kind === 'not-found' && (
                <div className='mt-3 flex items-center justify-between text-sm'>
                    <span className='text-gray-500'>No account found.</span>
                    <div className='flex gap-2'>
                        <button onClick={handleInvite} disabled={loading} className='text-sm font-medium text-blue-600 hover:underline disabled:opacity-50'>
                            Send invitation
                        </button>
                        <button onClick={reset} className='text-xs text-gray-400 hover:text-gray-600'>Clear</button>
                    </div>
                </div>
            )}

            {state.kind === 'invited' && (
                <div className='mt-3 flex items-center justify-between text-sm'>
                    <span className='text-gray-600'>Invitation sent to <span className='font-medium'>{state.email}</span>.</span>
                    <button onClick={reset} className='text-xs text-gray-400 hover:text-gray-600'>Clear</button>
                </div>
            )}

            {state.kind === 'error' && (
                <p className='mt-3 text-sm text-red-600'>{state.message}</p>
            )}
        </div>
    );
}

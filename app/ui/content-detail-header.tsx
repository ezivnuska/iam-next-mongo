// app/ui/content-detail-header.tsx

'use client';

import { useRef, useEffect } from 'react';
import { useModal } from '@/app/lib/hooks/use-modal';
import { useRouter } from 'next/navigation';
import { ChevronLeftIcon, EllipsisIcon, Modal } from '@iam/ui';
import { UserAvatar } from '@iam/ui';
import DeleteButtonWithConfirm from './delete-button-with-confirm';
import { Button } from '@iam/ui';
import CreateEntryForm from './entries/create-entry-form';
import { formatRelativeTime } from '@/app/lib/utils/format-date';
import { useContentPermissions } from '@/app/lib/hooks/use-content-permissions';
import { useContentDelete } from '@/app/lib/hooks/use-content-delete';
import type { Entry } from '@/app/lib/definitions/entry';
import type { Image as ImageType } from '@/app/lib/definitions/image';

interface ContentDetailHeaderProps {
    item: Entry;
    avatar?: ImageType | null;
}

export default function ContentDetailHeader({ item, avatar }: ContentDetailHeaderProps) {
    const router = useRouter();
    const { canEdit, canDelete } = useContentPermissions(item.author.id);
    const handleDelete = useContentDelete('entries', () => router.back());
    const { isOpen: menuOpen, open: openMenu, close: closeMenu, toggle: toggleMenu } = useModal();
    const { isOpen: showEditModal, open: openEditModal, close: closeEditModal } = useModal();
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                closeMenu();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuOpen, closeMenu]);

    const hasActions = canEdit || canDelete;

    return (
        <div className='flex items-center justify-between py-2'>
            <button
                onClick={() => router.back()}
                className='flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors cursor-pointer'
                aria-label='Go back'
            >
                <ChevronLeftIcon className='w-6 h-6' />
            </button>

            <div className='flex items-center gap-2 flex-1 px-3'>
                <div className='shrink-0' style={{ width: 40, height: 40 }}>
                    <UserAvatar username={item.author.username} avatar={avatar} size={40} />
                </div>
                <div className='flex items-center gap-1.5 min-w-0'>
                    <span className='font-semibold text-sm text-gray-900 leading-tight truncate'>{item.author.username}</span>
                    <span className='text-gray-300 leading-tight select-none'>·</span>
                    <span className='text-xs text-gray-400 leading-tight whitespace-nowrap'>{formatRelativeTime(item.createdAt)}</span>
                </div>
            </div>

            {hasActions ? (
                <div className='relative' ref={menuRef}>
                    <button
                        onClick={toggleMenu}
                        className='flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors cursor-pointer'
                        aria-label='More options'
                    >
                        <EllipsisIcon className='w-5 h-5' />
                    </button>

                    {menuOpen && (
                        <div className='absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-lg shadow-lg py-1 z-50'>
                            <div className='flex flex-col px-2 py-1'>
                                {canEdit && (
                                    <Button size='sm' variant='ghost' onClick={() => { closeMenu(); openEditModal(); }}>
                                        Edit
                                    </Button>
                                )}
                                {canDelete && (
                                    <DeleteButtonWithConfirm onDelete={() => handleDelete(item.id)} />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className='w-6' />
            )}

            {showEditModal && (
                <Modal isOpen={true} onClose={closeEditModal}>
                    <CreateEntryForm
                        editItem={item}
                        onSuccess={() => { closeEditModal(); router.refresh(); }}
                        onClose={closeEditModal}
                    />
                </Modal>
            )}
        </div>
    );
}

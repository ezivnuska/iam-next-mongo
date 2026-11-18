// app/ui/images/images-client.tsx

'use client';

import { useEffect, useState } from 'react';
import { Modal, Button, LoadingSpinner } from '@iam/ui';
import { useModal } from '@/app/lib/hooks/use-modal';
import UploadForm from '@/app/ui/images/upload-form';
import ImageGallery from './image-gallery';
import type { Image } from '@/app/lib/definitions/image';
import { getImages } from '@/app/lib/actions/images';
interface ImagesClientProps {
  authorized?: boolean;
  userId?: string;
  triggerUpload?: number;
  showUploadButton?: boolean;
}

export default function ImagesClient({ userId, authorized, triggerUpload, showUploadButton = false }: ImagesClientProps) {
    const [images, setImages] = useState<Image[]>([]);
    const [loading, setLoading] = useState(false);
    const { isOpen: isModalOpen, open: openModal, close: closeModal } = useModal();

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        getImages(userId).then(imgs => {
            if (!cancelled) { setImages(imgs); setLoading(false); }
        });
        return () => { cancelled = true; };
    }, [userId])

    useEffect(() => {
        if (triggerUpload) openModal();
    }, [triggerUpload])

    const handleUploadSuccess = (uploadedImage: Image) => {
        setImages((prev) => [uploadedImage, ...prev]);
        closeModal();
    };

    const handleImageUpdate = (imageId: string, updates: Partial<Image>) => {
        setImages(prev => prev.map(img =>
            img.id === imageId ? { ...img, ...updates } : img
        ));
    };

    return (
        <div className='flex flex-col flex-1 min-h-0 w-full gap-4 px-4'>
            {showUploadButton && (
                <Button onClick={openModal}>
                    Upload File
                </Button>
            )}
            {!loading
                ? (
                    <ImageGallery
                        images={images}
                        onDeleted={(deletedId) => setImages(prev => prev.filter(img => img.id !== deletedId))}
                        onImageUpdate={handleImageUpdate}
                        authorized={authorized}
                    />
                )
                : <LoadingSpinner fullscreen={false} />
            }

            <Modal isOpen={isModalOpen} onClose={closeModal}>
                <h1 className='mb-4 text-2xl font-semibold'>Upload a File</h1>
                <UploadForm
                    onUploadSuccess={handleUploadSuccess}
                    onClose={closeModal}
                />
            </Modal>
        </div>
    );
}

// app/ui/images/images-client.tsx

'use client';

import { useEffect, useState } from 'react';
import Modal from '@/app/ui/modal';
import UploadForm from '@/app/ui/images/upload-form';
import ImageGallery from './image-gallery';
import type { Image } from '@/app/lib/definitions/image';
import { Button } from '@/app/ui/button';
import { getImages } from '@/app/lib/actions/images';
import ProfileTabBar from '@/app/ui/user/profile-tab-bar';

interface ImagesClientProps {
  authorized?: boolean;
  userId?: string;
  username?: string;
}

export default function ImagesClient({ userId, authorized, username }: ImagesClientProps) {
    const [images, setImages] = useState<Image[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    async function initImages() {
        setLoading(true)
        const fetchedImages = await getImages(userId);
        setImages(fetchedImages)
        setLoading(false)
    }

    useEffect(() => {
        initImages()
    }, [])

    const handleUploadSuccess = (uploadedImage: Image) => {
        setImages((prev) => [uploadedImage, ...prev]);
        setIsModalOpen(false);
    };

    const handleImageUpdate = (imageId: string, updates: Partial<Image>) => {
        setImages(prev => prev.map(img =>
            img.id === imageId ? { ...img, ...updates } : img
        ));
    };

    return (
        <div className='flex flex-col w-full gap-4'>
            {username && (
                <ProfileTabBar username={username} activeTab='images' isOwnProfile={authorized} />
            )}
            {authorized && (
                <Button onClick={() => setIsModalOpen(true)}>
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
                : <p>Loading images...</p>
            }

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <h1 className='mb-4 text-2xl font-semibold'>Upload a File</h1>
                <UploadForm
                    onUploadSuccess={handleUploadSuccess}
                    onClose={() => setIsModalOpen(false)}
                />
            </Modal>
        </div>
    );
}

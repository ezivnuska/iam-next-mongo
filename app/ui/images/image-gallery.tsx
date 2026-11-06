'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { useUser } from '@/app/lib/providers/user-provider';
import { useCarousel } from '@/app/lib/hooks/use-carousel';
import Lightbox from '@/app/ui/lightbox';
import ImageModalMenu from '@/app/ui/images/image-modal-menu';
import type { Image as ImageType } from '@/app/lib/definitions/image';

interface ImageGalleryProps {
  authorized?: boolean;
  images: ImageType[];
  onDeleted?: (deletedId: string) => void;
  onImageUpdate?: (imageId: string, updates: Partial<ImageType>) => void;
}

export default function ImageGallery({ authorized, images, onDeleted, onImageUpdate }: ImageGalleryProps) {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [openIndex, setOpenIndex] = useState(0);

  const carousel = useCarousel({
    items: images,
    initialIndex: openIndex,
    onClose: () => setIsOpen(false),
    enabled: isOpen,
  });

  const selectedImage = isOpen ? carousel.currentItem : undefined;
  const isAvatar = !!(selectedImage && user?.avatar?.id === selectedImage.id);

  const openAt = (index: number) => {
    setOpenIndex(index);
    setIsOpen(true);
  };

  const handleLikeChange = useCallback((newLiked: boolean, _newCount: number) => {
    if (!selectedImage || !onImageUpdate) return;
    onImageUpdate(selectedImage.id, {
      likedByCurrentUser: newLiked,
      likes: newLiked
        ? [...(selectedImage.likes || []), user?.id || '']
        : (selectedImage.likes || []).filter(id => id !== user?.id),
    });
  }, [selectedImage, onImageUpdate, user?.id]);

  const handleCommentCountChange = useCallback((newCount: number) => {
    if (!selectedImage || !onImageUpdate) return;
    onImageUpdate(selectedImage.id, { commentCount: newCount });
  }, [selectedImage, onImageUpdate]);

  const handleDeletion = useCallback(() => {
    if (onDeleted && selectedImage) onDeleted(selectedImage.id);
    setIsOpen(false);
  }, [onDeleted, selectedImage]);

  return (
    <>
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4'>
        {images.length ? (
          images.map((img, index) => {
            const medium = img.variants.find(v => v.size === 'medium');
            return (
              <div
                key={img.id}
                className='relative rounded-lg overflow-hidden shadow w-full h-48 cursor-pointer'
                onClick={() => openAt(index)}
              >
                {medium?.url ? (
                  <Image
                    src={medium.url}
                    alt={img.alt || 'Uploaded image'}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes='(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw'
                  />
                ) : (
                  <div className='w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 text-sm'>
                    No preview
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <p>No images uploaded yet.</p>
        )}
      </div>

      {selectedImage && (
        <Lightbox
          src={selectedImage.variants.find(v => v.size === 'original')?.url || selectedImage.variants[0].url}
          alt={selectedImage.alt || 'Full image'}
          onClose={() => setIsOpen(false)}
          positionText={carousel.positionText}
          touchHandlers={carousel.touchHandlers}
        >
          <ImageModalMenu
            imageId={selectedImage.id}
            currentUserId={user?.id}
            currentUserRole={user?.role}
            initialLiked={selectedImage.likedByCurrentUser}
            initialLikeCount={selectedImage.likes?.length || 0}
            initialCommentCount={selectedImage.commentCount || 0}
            authorized={authorized}
            isAvatar={isAvatar}
            onDeleted={handleDeletion}
            onLikeChange={handleLikeChange}
            onCommentCountChange={handleCommentCountChange}
          />
        </Lightbox>
      )}
    </>
  );
}

// app/ui/image-gallery.tsx

'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { useUser } from '@/app/lib/providers/user-provider';
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
  const [selectedImage, setSelectedImage] = useState<ImageType | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const isAvatar = selectedImage && user?.avatar?.id === selectedImage.id;
  const minSwipeDistance = 50;

  const closeModal = useCallback(() => {
    setSelectedImage(null);
  }, []);

  const goToNext = useCallback(() => {
    if (currentIndex < images.length - 1) setCurrentIndex(prev => prev + 1);
  }, [currentIndex, images.length]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  }, [currentIndex]);

  // Update selectedImage when currentIndex changes
  useEffect(() => {
    if (selectedImage && images[currentIndex]) {
      setSelectedImage(images[currentIndex]);
    }
  }, [currentIndex, images, selectedImage]);

  // Keyboard navigation
  useEffect(() => {
    if (!selectedImage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); goToNext(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goToPrevious(); }
      else if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage, goToNext, goToPrevious, closeModal]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) goToNext();
    else if (distance < -minSwipeDistance) goToPrevious();
  };

  const handleLikeChange = useCallback((newLiked: boolean, newCount: number) => {
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
    closeModal();
  }, [onDeleted, selectedImage, closeModal]);

  return (
    <>
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4'>
        {images.length
          ? images.map((img, index) => {
              const medium = img.variants.find(v => v.size === 'medium');
              return (
                <div
                  key={img.id}
                  className='relative rounded-lg overflow-hidden shadow w-full h-48 cursor-pointer'
                  onClick={() => { setCurrentIndex(index); setSelectedImage(img); }}
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
          : <p>No images uploaded yet.</p>
        }
      </div>

      {selectedImage && (
        <div
          className='fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50'
          onClick={closeModal}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className='relative max-w-5xl w-full h-full flex items-center justify-center p-4'>
            <Image
              src={
                selectedImage.variants.find(v => v.size === 'original')?.url ||
                selectedImage.variants[0].url
              }
              alt={selectedImage.alt || 'Full image'}
              fill
              style={{ objectFit: 'contain' }}
              sizes='100vw'
            />
            <button
              className='absolute top-4 right-4 bg-white rounded-full px-3 py-1 shadow text-black z-10'
              onClick={closeModal}
            >
              ✕
            </button>
            <div className='absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 text-white rounded-full px-4 py-2 text-sm z-10'>
              {currentIndex + 1} / {images.length}
            </div>

            <ImageModalMenu
              imageId={selectedImage.id}
              currentUserId={user?.id}
              currentUserRole={user?.role}
              initialLiked={selectedImage.likedByCurrentUser}
              initialLikeCount={selectedImage.likes?.length || 0}
              initialCommentCount={selectedImage.commentCount || 0}
              authorized={authorized}
              isAvatar={isAvatar || false}
              onDeleted={handleDeletion}
              onLikeChange={handleLikeChange}
              onCommentCountChange={handleCommentCountChange}
            />
          </div>
        </div>
      )}
    </>
  );
}

// app/ui/image-gallery.tsx

"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { useUser } from "@/app/lib/providers/user-provider";
import DeleteButton from "@/app/ui/images/delete-image-button";
import AvatarButton from "@/app/ui/user/set-avatar-button";
import CommentForm from "@/app/ui/comments/comment-form";
import Modal from "@/app/ui/modal";
import ImageModalMenu from "@/app/ui/images/image-modal-menu";
import LikeButton from "@/app/ui/like-button";
import { createComment } from "@/app/lib/actions/comments";
import type { Image as ImageType } from "@/app/lib/definitions/image";
import type { Comment } from "@/app/lib/definitions/comment";

interface ImageGalleryProps {
  authorized?: boolean;
  images: ImageType[];
  onDeleted?: (deletedId: string) => void;
}

export default function ImageGallery({ authorized, images, onDeleted }: ImageGalleryProps) {
  const { user } = useUser();
  const [selectedImage, setSelectedImage] = useState<ImageType | null>(null);
  const [isMenuExpanded, setIsMenuExpanded] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const menuRef = useRef<{ addComment: (comment: Comment) => void }>(null);

  const closeModal = useCallback(() => {
    setSelectedImage(null);
    setIsMenuExpanded(false);
    setShowCommentForm(false);
  }, []);

  const toggleMenuExpanded = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuExpanded(prev => !prev);
  }, []);

  const openCommentForm = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowCommentForm(true);
  }, []);

  const handleCommentSubmit = useCallback(async (content: string) => {
    if (!selectedImage || !user) return;
    try {
      const newComment = await createComment(selectedImage.id, 'Image', content);
      setShowCommentForm(false);
      if (!isMenuExpanded) setIsMenuExpanded(true);

      // Add new comment via menu ref
      const optimisticComment: Comment = {
        id: newComment.id,
        refId: selectedImage.id,
        refType: 'Image',
        author: {
          id: user.id,
          username: user.username,
          avatar: user.avatar ? {
            id: user.avatar.id,
            variants: user.avatar.variants,
          } : null,
        },
        content: content,
        createdAt: newComment.createdAt,
      };

      menuRef.current?.addComment(optimisticComment);
    } catch (error) {
      console.error('Failed to create comment:', error);
      throw error; // Re-throw so CommentForm can handle it
    }
  }, [selectedImage, user, isMenuExpanded]);

  return (
    <>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {images.length
            ? images.map((img) => {
                const medium = img.variants.find((v) => v.size === "medium");
                const isAvatar = user?.avatar?.id === img.id;
                return (
                    <div
                        key={img.id}
                        className="relative rounded-lg overflow-hidden shadow w-full h-48"
                    >
                        {medium?.url ? (
                            <>
                                <Image
                                    src={medium.url}
                                    alt={img.alt || "Uploaded image"}
                                    fill
                                    style={{ objectFit: "cover" }}
                                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                    onClick={() => setSelectedImage(img)}
                                />
                                {authorized && (
                                    <AvatarButton
                                        imageId={img.id}
                                        isAvatar={isAvatar}
                                    />
                                )}
                                {authorized && (
                                    <DeleteButton
                                        imageId={img.id}
                                        onDeleted={() => onDeleted?.(img.id)}
                                    />
                                )}
                            </>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 text-sm">
                                No preview
                            </div>
                        )}
                    </div>
                );
            })
            : <p>No images uploaded yet.</p>
        }
        </div>

        {/* Modal */}
        {selectedImage && (
            <div
                className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
                onClick={closeModal}
            >
                <div className="relative max-w-5xl w-full h-full flex items-center justify-center p-4">
                    <Image
                        src={
                            selectedImage.variants.find((v) => v.size === "original")?.url ||
                            selectedImage.variants[0].url
                        }
                        alt={selectedImage.alt || "Full image"}
                        fill
                        style={{ objectFit: "contain" }}
                        sizes="100vw"
                    />
                    <button
                        className="absolute top-4 right-4 bg-white rounded-full px-3 py-1 shadow text-black z-10"
                        onClick={closeModal}
                    >
                        ✕
                    </button>

                    <ImageModalMenu
                        ref={menuRef}
                        isExpanded={isMenuExpanded}
                        onToggleExpanded={toggleMenuExpanded}
                        onOpenCommentForm={openCommentForm}
                        imageId={selectedImage.id}
                        currentUserId={user?.id}
                        currentUserRole={user?.role}
                        initialLiked={selectedImage.likedByCurrentUser}
                        initialLikeCount={selectedImage.likes?.length || 0}
                        initialCommentCount={selectedImage.commentCount || 0}
                    />

                    {/* Comment Form Modal */}
                    {showCommentForm && (
                        <Modal
                            onClose={() => setShowCommentForm(false)}
                            position="absolute"
                            className="bg-black bg-opacity-60"
                            contentClassName="bg-white rounded-lg p-6 max-w-2xl w-full"
                            showCloseButton
                        >
                            <h3 className="text-lg font-semibold mb-4">Add a comment</h3>
                            <CommentForm
                                refId={selectedImage.id}
                                refType="Image"
                                onSubmit={handleCommentSubmit}
                            />
                        </Modal>
                    )}
                </div>
            </div>
        )}
    </>
  );
}

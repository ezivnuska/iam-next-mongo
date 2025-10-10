// app/ui/image-gallery.tsx

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useUser } from "@/app/lib/providers/user-provider";
import DeleteButton from "@/app/ui/delete-image-button";
import AvatarButton from "@/app/ui/set-avatar-button";
import CommentForm from "@/app/ui/comment-form";
import CommentList from "@/app/ui/comment-list";
import { createComment, getComments } from "@/app/lib/actions/comments";
import type { Image as ImageType } from "@/app/lib/definitions/image";

interface ImageGalleryProps {
  authorized?: boolean;
  images: ImageType[];
  onDeleted?: (deletedId: string) => void;
}

export default function ImageGallery({ authorized, images, onDeleted }: ImageGalleryProps) {
  const { user } = useUser();
  const [selectedImage, setSelectedImage] = useState<ImageType | null>(null);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [showCommentList, setShowCommentList] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    if (selectedImage && showCommentList) {
      loadComments();
    }
  }, [selectedImage, showCommentList]);

  const loadComments = async () => {
    if (!selectedImage) return;
    setLoadingComments(true);
    try {
      const fetchedComments = await getComments(selectedImage.id, 'Image');
      setComments(fetchedComments);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

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
                onClick={() => {
                    setSelectedImage(null);
                    setShowCommentForm(false);
                    setShowCommentList(false);
                    setComments([]);
                }}
            >
                <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center p-4">
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
                        className="absolute top-4 right-4 bg-white rounded-full px-3 py-1 shadow text-black"
                        onClick={() => {
                            setSelectedImage(null);
                            setShowCommentForm(false);
                            setShowCommentList(false);
                            setComments([]);
                        }}
                    >
                        ✕
                    </button>
                    <div className="absolute bottom-4 right-4 flex gap-2">
                        <button
                            className="bg-gray-600 text-white rounded-lg px-4 py-2 shadow hover:bg-gray-700 transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowCommentList(!showCommentList);
                                setShowCommentForm(false);
                            }}
                        >
                            {showCommentList ? 'Hide Comments' : 'View Comments'}
                        </button>
                        <button
                            className="bg-blue-600 text-white rounded-lg px-4 py-2 shadow hover:bg-blue-700 transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowCommentForm(true);
                            }}
                        >
                            Comment
                        </button>
                    </div>

                    {/* Comment List Overlay */}
                    {showCommentList && (
                        <div
                            className="absolute inset-0 flex items-end"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowCommentList(false);
                            }}
                        >
                            <div
                                className="bg-white rounded-t-lg w-full max-h-[60vh] overflow-y-auto p-6"
                                onClick={(e) => e.stopPropagation()}
                                style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.3)' }}
                            >
                                <h3 className="text-lg font-semibold mb-4">Comments</h3>
                                {loadingComments ? (
                                    <div className="text-center py-8 text-gray-500">Loading comments...</div>
                                ) : (
                                    <CommentList comments={comments} />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Comment Form Overlay */}
                    {showCommentForm && (
                        <div
                            className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowCommentForm(false);
                            }}
                        >
                            <div
                                className="bg-white rounded-lg p-6 max-w-2xl w-full"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold">Add a comment</h3>
                                    <button
                                        className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                                        onClick={() => setShowCommentForm(false)}
                                    >
                                        ✕
                                    </button>
                                </div>
                                <CommentForm
                                    refId={selectedImage.id}
                                    refType="Image"
                                    onSubmit={async (content) => {
                                        await createComment(selectedImage.id, 'Image', content);
                                        setShowCommentForm(false);
                                        if (showCommentList) {
                                            loadComments();
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}
    </>
  );
}

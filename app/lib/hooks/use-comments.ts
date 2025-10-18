// app/lib/hooks/use-comments.ts

import { useState, useCallback, useEffect } from 'react';
import { getComments, deleteComment as deleteCommentAction, createComment as createCommentAction } from '@/app/lib/actions/comments';
import { handleError } from '@/app/lib/utils/error-handler';
import { useSocket } from '@/app/lib/providers/socket-provider';
import { SOCKET_EVENTS } from '@/app/lib/socket/events';
import type { CommentPayload } from '@/app/lib/socket/events';
import type { Comment } from '@/app/lib/definitions/comment';
import type { CommentRefType } from '@/app/lib/definitions/comment';

export type UseCommentsOptions = {
  itemId: string;
  itemType: CommentRefType;
  initialCommentCount?: number;
  onCommentCountChange?: (count: number) => void;
  autoLoad?: boolean;
};

export type UseCommentsResult = {
  comments: Comment[];
  commentCount: number;
  loadingComments: boolean;
  commentsLoaded: boolean;
  loadComments: () => Promise<void>;
  addComment: (comment: Comment) => void;
  deleteComment: (commentId: string) => Promise<void>;
  createComment: (content: string) => Promise<Comment>;
  resetComments: () => void;
};

export function useComments({
  itemId,
  itemType,
  initialCommentCount = 0,
  onCommentCountChange,
  autoLoad = false,
}: UseCommentsOptions): UseCommentsResult {
  const { socket } = useSocket();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);

  // Update comment count and notify parent
  const updateCommentCount = useCallback((newCount: number) => {
    setCommentCount(newCount);
    onCommentCountChange?.(newCount);
  }, [onCommentCountChange]);

  // Load comments from server
  const loadComments = useCallback(async () => {
    if (!itemId) return;
    setLoadingComments(true);
    try {
      const fetchedComments = await getComments(itemId, itemType);
      setComments(fetchedComments);
      updateCommentCount(fetchedComments.length);
      setCommentsLoaded(true);
    } catch (error) {
      handleError(error, 'Failed to load comments');
    } finally {
      setLoadingComments(false);
    }
  }, [itemId, itemType, updateCommentCount]);

  // Add a comment optimistically
  const addComment = useCallback((comment: Comment) => {
    setComments(prev => [comment, ...prev]);
    updateCommentCount(commentCount + 1);
    setCommentsLoaded(true);
  }, [commentCount, updateCommentCount]);

  // Delete a comment with optimistic update
  const deleteComment = useCallback(async (commentId: string) => {
    // Optimistic update
    const previousComments = comments;
    const previousCount = commentCount;

    setComments(prev => prev.filter(c => c.id !== commentId));
    updateCommentCount(previousCount - 1);

    try {
      await deleteCommentAction(commentId);
    } catch (error) {
      // Rollback on error
      handleError(error, 'Failed to delete comment');
      setComments(previousComments);
      updateCommentCount(previousCount);
    }
  }, [comments, commentCount, updateCommentCount]);

  // Create a new comment
  const createComment = useCallback(async (content: string): Promise<Comment> => {
    try {
      const newComment = await createCommentAction(itemId, itemType, content);
      addComment(newComment);
      return newComment;
    } catch (error) {
      handleError(error, 'Failed to create comment');
      throw error;
    }
  }, [itemId, itemType, addComment]);

  // Reset comments state
  const resetComments = useCallback(() => {
    setComments([]);
    setCommentCount(initialCommentCount);
    setCommentsLoaded(false);
    setLoadingComments(false);
    onCommentCountChange?.(initialCommentCount);
  }, [initialCommentCount, onCommentCountChange]);

  // Listen for socket events to update comments in real-time
  useEffect(() => {
    if (!socket) return;

    const handleCommentAdded = (payload: CommentPayload) => {
      if (payload.refId === itemId && payload.refType === itemType) {
        // Only update count if comments are not loaded (to avoid duplication)
        if (!commentsLoaded) {
          updateCommentCount(commentCount + 1);
        }
      }
    };

    const handleCommentDeleted = (payload: CommentPayload) => {
      if (payload.refId === itemId && payload.refType === itemType) {
        // Remove from comments list if loaded
        if (commentsLoaded) {
          setComments(prev => prev.filter(c => c.id !== payload.commentId));
        }
        updateCommentCount(Math.max(0, commentCount - 1));
      }
    };

    socket.on(SOCKET_EVENTS.COMMENT_ADDED, handleCommentAdded);
    socket.on(SOCKET_EVENTS.COMMENT_DELETED, handleCommentDeleted);

    return () => {
      socket.off(SOCKET_EVENTS.COMMENT_ADDED, handleCommentAdded);
      socket.off(SOCKET_EVENTS.COMMENT_DELETED, handleCommentDeleted);
    };
  }, [socket, itemId, itemType, commentsLoaded, commentCount, updateCommentCount]);

  // Auto-load on mount if requested
  useEffect(() => {
    if (autoLoad) {
      loadComments();
    }
  }, [autoLoad, loadComments]);

  return {
    comments,
    commentCount,
    loadingComments,
    commentsLoaded,
    loadComments,
    addComment,
    deleteComment,
    createComment,
    resetComments,
  };
}

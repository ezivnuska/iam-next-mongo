// app/lib/hooks/use-comments.ts

import { useState, useCallback, useEffect, useRef } from 'react';
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
  currentUserId?: string;
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
  currentUserId,
}: UseCommentsOptions): UseCommentsResult {
  const { socket } = useSocket();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);

  // Store callback in ref to avoid dependency issues
  const onCommentCountChangeRef = useRef(onCommentCountChange);

  // Load comments from server
  const loadComments = useCallback(async () => {
    if (!itemId) return;
    setLoadingComments(true);
    try {
      const fetchedComments = await getComments(itemId, itemType);
      setComments(fetchedComments);
      setCommentCount(fetchedComments.length);
      setCommentsLoaded(true);
    } catch (error) {
      handleError(error, 'Failed to load comments');
    } finally {
      setLoadingComments(false);
    }
  }, [itemId, itemType]);

  // Add a comment optimistically
  const addComment = useCallback((comment: Comment) => {
    setComments(prev => [comment, ...prev]);
    setCommentCount(prev => prev + 1);
    setCommentsLoaded(true);
  }, []);

  // Delete a comment with optimistic update
  const deleteComment = useCallback(async (commentId: string) => {
    // Store previous state for rollback
    let previousComments: Comment[] = [];
    let previousCount = 0;

    // Optimistic update
    setComments(prev => {
      previousComments = prev;
      return prev.filter(c => c.id !== commentId);
    });

    setCommentCount(prev => {
      previousCount = prev;
      return Math.max(0, prev - 1);
    });

    try {
      await deleteCommentAction(commentId);
    } catch (error) {
      // Rollback on error
      handleError(error, 'Failed to delete comment');
      setComments(previousComments);
      setCommentCount(previousCount);
    }
  }, []);

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
    // Don't call onCommentCountChange here - parent already knows the initial count
  }, [initialCommentCount]);

  // Listen for socket events to update comments in real-time
  useEffect(() => {
    if (!socket) return;

    const handleCommentAdded = (payload: CommentPayload) => {
      if (payload.refId === itemId && payload.refType === itemType) {
        // Skip if comment is from current user (handled by optimistic update)
        if (currentUserId && payload.author.id === currentUserId) {
          return;
        }

        // Check if comment already exists
        setComments(prev => {
          const commentExists = prev.some(c => c.id === payload.commentId);

          // If comment doesn't exist and we have full comment data, add it
          if (!commentExists && payload.comment) {
            setCommentCount(current => current + 1);
            return [payload.comment as Comment, ...prev];
          }

          // If comment doesn't exist but no full data, just update count
          if (!commentExists && !payload.comment) {
            setCommentCount(current => current + 1);
          }

          // Comment already exists, don't change anything
          return prev;
        });
      }
    };

    const handleCommentDeleted = (payload: CommentPayload) => {
      if (payload.refId === itemId && payload.refType === itemType) {
        // If comments are loaded, check if comment exists before updating
        if (commentsLoaded) {
          setComments(prev => {
            const commentExists = prev.some(c => c.id === payload.commentId);
            // Only decrement count if comment actually exists (wasn't optimistically deleted by us)
            if (commentExists) {
              setCommentCount(current => Math.max(0, current - 1));
            }
            return prev.filter(c => c.id !== payload.commentId);
          });
        } else {
          // If comments not loaded, update count from socket event
          setCommentCount(prev => Math.max(0, prev - 1));
        }
      }
    };

    socket.on(SOCKET_EVENTS.COMMENT_ADDED, handleCommentAdded);
    socket.on(SOCKET_EVENTS.COMMENT_DELETED, handleCommentDeleted);

    return () => {
      socket.off(SOCKET_EVENTS.COMMENT_ADDED, handleCommentAdded);
      socket.off(SOCKET_EVENTS.COMMENT_DELETED, handleCommentDeleted);
    };
  }, [socket, itemId, itemType, commentsLoaded, currentUserId]);

  // Keep callback ref up to date
  useEffect(() => {
    onCommentCountChangeRef.current = onCommentCountChange;
  }, [onCommentCountChange]);

  // Notify parent of comment count changes (after render)
  useEffect(() => {
    onCommentCountChangeRef.current?.(commentCount);
  }, [commentCount]);

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

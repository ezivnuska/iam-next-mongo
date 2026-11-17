// app/lib/hooks/use-comments.ts

import { useState, useCallback, useEffect, useRef } from 'react';
import { getComments, deleteComment as deleteCommentAction, createComment as createCommentAction } from '@/app/lib/actions/comments';
import { handleError } from '@/app/lib/utils/error-handler';
import { useSocket } from '@/app/lib/providers/socket-provider';
import { SOCKET_EVENTS } from '@/app/lib/socket/events';
import type { CommentPayload } from '@/app/lib/socket/events';
import type { Comment } from '@/app/lib/definitions/comment';
import type { CommentRefType } from '@/app/lib/definitions/comment';
import { useSocketListener } from './use-socket-listener';

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

  useSocketListener<CommentPayload>(socket, SOCKET_EVENTS.COMMENT_ADDED, payload => {
    if (payload.refId !== itemId || payload.refType !== itemType) return;
    if (currentUserId && payload.author.id === currentUserId) return;
    setComments(prev => {
      const commentExists = prev.some(c => c.id === payload.commentId);
      if (!commentExists && payload.comment) {
        setCommentCount(current => current + 1);
        return [payload.comment as Comment, ...prev];
      }
      if (!commentExists && !payload.comment) {
        setCommentCount(current => current + 1);
      }
      return prev;
    });
  });

  useSocketListener<CommentPayload>(socket, SOCKET_EVENTS.COMMENT_DELETED, payload => {
    if (payload.refId !== itemId || payload.refType !== itemType) return;
    if (commentsLoaded) {
      setComments(prev => {
        const commentExists = prev.some(c => c.id === payload.commentId);
        if (commentExists) setCommentCount(current => Math.max(0, current - 1));
        return prev.filter(c => c.id !== payload.commentId);
      });
    } else {
      setCommentCount(prev => Math.max(0, prev - 1));
    }
  });

  // Keep callback ref up to date
  useEffect(() => {
    onCommentCountChangeRef.current = onCommentCountChange;
  }, [onCommentCountChange]);

  // Notify parent of comment count changes (after render)
  useEffect(() => {
    onCommentCountChangeRef.current?.(commentCount);
  }, [commentCount]);

  // Sync comment count when initialCommentCount prop changes
  // This ensures the count updates when parent component fetches fresh data
  useEffect(() => {
    if (!commentsLoaded) {
      setCommentCount(initialCommentCount);
    }
  }, [initialCommentCount, commentsLoaded]);

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

import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@/app/lib/socket/events';
import type { CommentPayload } from '@/app/lib/socket/events';
import type { ContentItem } from '@/app/lib/definitions/content';

type SetContent = React.Dispatch<React.SetStateAction<ContentItem[]>>;

export function useCommentCountSocket(socket: Socket | null, setContent: SetContent) {
    useEffect(() => {
        if (!socket) return;

        const handleCommentAdded = (payload: CommentPayload) => {
            setContent(prev => prev.map(item =>
                item.id === payload.refId
                    ? { ...item, commentCount: (item.commentCount || 0) + 1 }
                    : item
            ));
        };

        const handleCommentDeleted = (payload: CommentPayload) => {
            setContent(prev => prev.map(item =>
                item.id === payload.refId
                    ? { ...item, commentCount: Math.max(0, (item.commentCount || 0) - 1) }
                    : item
            ));
        };

        socket.on(SOCKET_EVENTS.COMMENT_ADDED, handleCommentAdded);
        socket.on(SOCKET_EVENTS.COMMENT_DELETED, handleCommentDeleted);

        return () => {
            socket.off(SOCKET_EVENTS.COMMENT_ADDED, handleCommentAdded);
            socket.off(SOCKET_EVENTS.COMMENT_DELETED, handleCommentDeleted);
        };
    }, [socket, setContent]);
}

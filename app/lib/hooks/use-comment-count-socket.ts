import type { Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@/app/lib/socket/events';
import type { CommentPayload } from '@/app/lib/socket/events';
import type { ContentItem } from '@/app/lib/definitions/content';
import { useSocketListener } from './use-socket-listener';

type SetContent = React.Dispatch<React.SetStateAction<ContentItem[]>>;

export function useCommentCountSocket(socket: Socket | null, setContent: SetContent) {
    useSocketListener<CommentPayload>(socket, SOCKET_EVENTS.COMMENT_ADDED, payload => {
        setContent(prev => prev.map(item =>
            item.id === payload.refId
                ? { ...item, commentCount: (item.commentCount || 0) + 1 }
                : item
        ));
    });

    useSocketListener<CommentPayload>(socket, SOCKET_EVENTS.COMMENT_DELETED, payload => {
        setContent(prev => prev.map(item =>
            item.id === payload.refId
                ? { ...item, commentCount: Math.max(0, (item.commentCount || 0) - 1) }
                : item
        ));
    });
}

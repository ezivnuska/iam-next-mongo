// app/api/socket/emit/route.ts
// Internal API route for server actions to emit socket events
// Also handles incoming client signals that trigger server-side actions

import { NextRequest, NextResponse } from 'next/server'
import { checkSocketRateLimit, SOCKET_RATE_LIMITS } from '@/app/lib/api/socket-rate-limiter'
import { generateGuestId, generateGuestUsername, isGuestId } from '@/app/poker/lib/utils/guest-utils'

export async function POST(request: NextRequest) {
	try {
		const body = await request.json()
		const { event, room, data, excludeUserId, signal, gameId, userId, username } = body

		// Helper function to validate userId for game actions
		// Note: Since this is called from socket server (internal), session cookies aren't available
		// So we validate based on userId format and database lookup
		async function validateUserId(userId: string): Promise<{ valid: boolean; error?: string }> {
			// Check if this is a guest user
			if (isGuestId(userId)) {
				// Guest user - valid if follows guest ID format
				return { valid: true };
			}

			// Authenticated user - verify exists in database
			try {
				const UserModel = (await import('@/app/lib/models/user')).default;
				const user = await UserModel.findById(userId);

				if (!user) {
					return { valid: false, error: 'User not found' };
				}

				return { valid: true };
			} catch (error) {
				console.error('[validateUserId] Error:', error);
				return { valid: false, error: 'Invalid user ID' };
			}
		}

		// Handle incoming client signals
		if (signal) {
			console.log('[Socket Emit Route] Received signal:', signal, 'for game:', gameId);

			if (signal === 'poker:join_game' && gameId && userId) {
				// Security validation: Verify userId authenticity
				// Note: Since this is called from socket server (internal), session cookies aren't available
				// So we validate based on userId format and database lookup
				let validatedUserId: string;
				let validatedUsername: string;

				// Check if this is a guest user request
				if (userId === 'guest-pending' || isGuestId(userId)) {
					// Guest user - generate new guest ID and username
					validatedUserId = generateGuestId();
					validatedUsername = generateGuestUsername();
					console.log('[Socket Emit Route] Generated guest:', validatedUserId, validatedUsername);
				} else {
					// Authenticated user - validate that user exists in database
					try {
						const UserModel = (await import('@/app/lib/models/user')).default;
						const user = await UserModel.findById(userId);

						if (!user) {
							console.error('[Socket Emit Route] User not found:', userId);
							return NextResponse.json({ error: 'User not found' }, { status: 404 });
						}

						validatedUserId = user._id.toString();
						validatedUsername = user.username || 'Player';
						console.log('[Socket Emit Route] Validated authenticated user:', validatedUserId, validatedUsername);
					} catch (error) {
						console.error('[Socket Emit Route] Error validating user:', error);
						return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
					}
				}

				const { handlePlayerJoin } = await import('@/app/poker/lib/server/actions/poker-game-controller');

				const result = await handlePlayerJoin(gameId, validatedUserId, validatedUsername);

				if (!result.success) {
					const errorMessage = result.error || 'Failed to join game';
					console.error('[Socket Emit Route] Join error:', errorMessage);

					// Return appropriate error
					if (errorMessage.includes('locked')) {
						return NextResponse.json({ error: 'Game is locked - no new players allowed' }, { status: 409 });
					} else if (errorMessage.includes('full')) {
						return NextResponse.json({ error: 'Game is full' }, { status: 409 });
					} else if (errorMessage.includes('not found')) {
						return NextResponse.json({ error: 'Game not found' }, { status: 404 });
					}

					return NextResponse.json({ error: errorMessage }, { status: 500 });
				}

				return NextResponse.json({
					success: true,
					gameState: result.gameState,
					userId: validatedUserId,
					username: validatedUsername
				});
			}

			if (signal === 'poker:leave_game' && gameId && userId) {
				// Validate userId
				const validation = await validateUserId(userId);
				if (!validation.valid) {
					return NextResponse.json({ error: validation.error }, { status: 403 });
				}

				const { handlePlayerLeave } = await import('@/app/poker/lib/server/actions/poker-game-controller');

				const result = await handlePlayerLeave(gameId, userId);

				if (!result.success) {
					const errorMessage = result.error || 'Failed to leave game';
					console.error('[Socket Emit Route] Leave error:', errorMessage);

					// Return appropriate error
					if (errorMessage.includes('not found')) {
						return NextResponse.json({ error: 'Game or player not found' }, { status: 404 });
					}

					return NextResponse.json({ error: errorMessage }, { status: 500 });
				}

				return NextResponse.json({ success: true, gameState: result.gameState });
			}

			if (signal === 'poker:ready_for_next_turn' && gameId) {
				const { handleReadyForNextTurn } = await import('@/app/poker/lib/server/turn/turn-handler');
				await handleReadyForNextTurn(gameId);
				return NextResponse.json({ success: true });
			}

			if (signal === 'poker:bet' && gameId && userId) {
			// Validate userId
			const validation = await validateUserId(userId);
			if (!validation.valid) {
				return NextResponse.json({ error: validation.error }, { status: 403 });
			}

			// Check rate limit
			const rateLimit = checkSocketRateLimit(userId, 'poker:bet', SOCKET_RATE_LIMITS.GAME_ACTION);
			if (rateLimit.isLimited) {
				const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
				console.warn(`[Socket Emit] Rate limit exceeded for user ${userId} on poker:bet`);
				return NextResponse.json(
					{ error: 'Too many bet requests. Please slow down.' },
					{
						status: 429,
						headers: {
							'Retry-After': retryAfter.toString(),
						}
					}
				);
			}

			const { placeBet } = await import('@/app/poker/lib/server/actions/poker-game-controller');
			const { chipCount } = body;

			try {
				const result = await placeBet(gameId, userId, chipCount ?? 1);
				const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');

				// Emit granular events based on what happened
				await PokerSocketEmitter.emitGameActionResults(result.events);

				return NextResponse.json({ success: true });
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to place bet';
				console.error('[Socket Emit Route] Bet error:', errorMessage);
				return NextResponse.json({ error: errorMessage }, { status: 500 });
			}
		}

		if (signal === 'poker:fold' && gameId && userId) {
			// Validate userId
			const validation = await validateUserId(userId);
			if (!validation.valid) {
				return NextResponse.json({ error: validation.error }, { status: 403 });
			}

			// Check rate limit
			const rateLimit = checkSocketRateLimit(userId, 'poker:fold', SOCKET_RATE_LIMITS.GAME_ACTION);
			if (rateLimit.isLimited) {
				const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
				console.warn(`[Socket Emit] Rate limit exceeded for user ${userId} on poker:fold`);
				return NextResponse.json(
					{ error: 'Too many fold requests. Please slow down.' },
					{
						status: 429,
						headers: {
							'Retry-After': retryAfter.toString(),
						}
					}
				);
			}

			const { fold } = await import('@/app/poker/lib/server/actions/poker-game-controller');

			try {
				await fold(gameId, userId);
				return NextResponse.json({ success: true });
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to fold';
				console.error('[Socket Emit Route] Fold error:', errorMessage);
				return NextResponse.json({ error: errorMessage }, { status: 500 });
			}
		}

		if (signal === 'poker:set_timer_action' && gameId && userId) {
			// Validate userId
			const validation = await validateUserId(userId);
			if (!validation.valid) {
				return NextResponse.json({ error: validation.error }, { status: 403 });
			}

			// Check rate limit
			const rateLimit = checkSocketRateLimit(userId, 'poker:set_timer_action', SOCKET_RATE_LIMITS.TIMER);
			if (rateLimit.isLimited) {
				const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
				console.warn(`[Socket Emit] Rate limit exceeded for user ${userId} on poker:set_timer_action`);
				return NextResponse.json(
					{ error: 'Too many timer action requests. Please slow down.' },
					{
						status: 429,
						headers: {
							'Retry-After': retryAfter.toString(),
						}
					}
				);
			}

			const { setTurnTimerAction } = await import('@/app/poker/lib/server/actions/poker-game-controller');
			const { timerAction, betAmount } = body;

			if (!timerAction || !['fold', 'call', 'check', 'bet', 'raise'].includes(timerAction)) {
				return NextResponse.json(
					{ error: 'Invalid timerAction. Must be one of: fold, call, check, bet, raise' },
					{ status: 400 }
				);
			}

			try {
				await setTurnTimerAction(gameId, userId, timerAction, betAmount);
				return NextResponse.json({ success: true });
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to set timer action';
				console.error('[Socket Emit Route] Timer action error:', errorMessage);
				return NextResponse.json({ error: errorMessage }, { status: 500 });
			}
		}

		if (signal === 'poker:set_presence' && gameId && userId) {
			// Validate userId
			const validation = await validateUserId(userId);
			if (!validation.valid) {
				return NextResponse.json({ error: validation.error }, { status: 403 });
			}

			const { setPlayerPresence } = await import('@/app/poker/lib/server/actions/poker-game-controller');
			const { isAway } = body;

			try {
				await setPlayerPresence(gameId, userId, isAway);
				return NextResponse.json({ success: true });
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to set presence';
				console.error('[Socket Emit Route] Presence error:', errorMessage);
				return NextResponse.json({ error: errorMessage }, { status: 500 });
			}
		}

		return NextResponse.json({ error: 'Unknown signal' }, { status: 400 });
		}

		console.log('[Socket Emit Route] Received emit request:', { event, room, hasData: !!data, excludeUserId });

		if (typeof global.io === 'undefined') {
			console.error('Socket.IO not initialized')
			return NextResponse.json({ error: 'Socket.IO not initialized' }, { status: 500 })
		}

		const io = global.io as any

		// Emit the event
		if (excludeUserId) {
			// Emit to all sockets except those belonging to excludeUserId
			const sockets = await io.fetchSockets()
			for (const socket of sockets) {
				// Check if this socket belongs to the excluded user
				if (socket.userId !== excludeUserId) {
					if (room) {
						// Check if socket is in the room before emitting
						if (socket.rooms.has(room)) {
							socket.emit(event, data)
						}
					} else {
						socket.emit(event, data)
					}
				}
			}
		} else if (room) {
			console.log('[Socket Emit Route] Emitting to room:', room);
			io.to(room).emit(event, data)
		} else {
			console.log('[Socket Emit Route] Broadcasting to ALL connected sockets');
			const connectedSockets = await io.fetchSockets();
			console.log('[Socket Emit Route] Number of connected sockets:', connectedSockets.length);
			io.emit(event, data)
		}

		console.log('[Socket Emit Route] Emit completed successfully');
		return NextResponse.json({ success: true })
	} catch (error: any) {
		console.error('Socket emit error:', error)
		return NextResponse.json({ error: error.message }, { status: 500 })
	}
}

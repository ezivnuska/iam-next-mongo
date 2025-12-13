// app/lib/config/poker-constants.ts

/**
 * Centralized configuration constants for poker game
 * Extracted to avoid magic numbers throughout the codebase
 */

export const POKER_GAME_CONFIG = {
  /** Maximum number of players allowed in a game */
  MAX_PLAYERS: 5,

  /** Default number of chips each player starts with */
  DEFAULT_STARTING_CHIPS: 100,

  /** Value of each chip for display purposes */
  CHIP_VALUE: 1,

  /** Duration in milliseconds for player joined notification */
  PLAYER_JOINED_NOTIFICATION_DURATION_MS: 2000,  // 2 seconds

  /** Delay in milliseconds before game starts after players join (game starting notification) */
  AUTO_LOCK_DELAY_MS: 10000,  // 10 seconds

  /** Delay in seconds before game auto-locks (for timer display) */
  AUTO_LOCK_DELAY_SECONDS: 10,  // 10 seconds

  /** Duration in milliseconds for winner notification before resetting */
  WINNER_NOTIFICATION_DURATION_MS: 10000,  // 10 seconds

  /** Minimum bet amount in chips */
  MIN_BET_AMOUNT: 1,

  /** Small blind amount in chips */
  SMALL_BLIND: 1,

  /** Big blind amount in chips */
  BIG_BLIND: 2,
} as const;

export const POKER_TIMERS = {
  /** Duration in seconds for player action timer */
  ACTION_DURATION_SECONDS: 15,

  /** Small delay in milliseconds to ensure write propagation after lock acquisition */
  LOCK_ACQUISITION_DELAY_MS: 10,

  /** Timeout in milliseconds for acquiring game lock */
  GAME_LOCK_TIMEOUT_MS: 10000,

  /** Delay in milliseconds before advancing to next stage (for paced transitions) */
  STAGE_TRANSITION_DELAY_MS: 4000,

  /** Buffer delay in milliseconds to ensure client has time to process previous stage */
  CLIENT_PROCESSING_BUFFER_MS: 1500,

  /** Duration in milliseconds for general game notifications (stage changes, etc.) */
  NOTIFICATION_DURATION_MS: 4000,

  /** Duration in milliseconds for player action notifications (bet, fold, call, etc.) */
  PLAYER_ACTION_NOTIFICATION_DURATION_MS: 2000,

  /** Delay in milliseconds after showing notification (notification duration + buffer) */
  POST_NOTIFICATION_DELAY_MS: 4000,

  /** Interval in milliseconds for timer percentage updates */
  TIMER_UPDATE_INTERVAL_MS: 100,

  /** Time window in milliseconds for deduplicating action history entries */
  ACTION_HISTORY_DEDUP_WINDOW_MS: 1000,
} as const;

export const POKER_RETRY_CONFIG = {
  /** Maximum number of retry attempts for concurrent operations */
  MAX_RETRIES: 8,

  /** Base delay in milliseconds between retry attempts */
  BASE_DELAY_MS: 50,

  /** Check if an error is retryable (version conflicts, lock contention) */
  isRetryable: (error: any): boolean => {
    return error.message?.includes('No matching document found') ||
           error.message?.includes('version') ||
           error.name === 'VersionError' ||
           error.message?.includes('currently being processed');
  },
} as const;

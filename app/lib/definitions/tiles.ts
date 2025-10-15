// app/lib/definitions/tiles.ts

import type { User } from "./user"

export enum Direction {
    UP = 'up',
    DOWN = 'down',
    LEFT = 'left',
    RIGHT = 'right',
    NONE = 'none',
}

export type TileType = {
    id: number
    col: number
    row: number
    direction: Direction
}

export enum GameStatus {
    IDLE = 'idle',
    START = 'start',
    PLAYING = 'playing',
    PAUSED = 'paused',
    RESOLVED = 'resolved',
}

export type EmptyPosition = {
    col: number
    row: number
}

export interface Score {
	_id: string
	user: User
	score: string
    createdAt: string
}
// app/lib/providers/tile-provider.tsx

"use client";

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useReducer,
    useState,
    ReactNode,
} from 'react'
import { Direction, EmptyPosition, GameStatus, Score, TileType } from '@/app/lib/definitions/tiles'
import { useUser } from '@/app/lib/providers/user-provider'

// ------------------ Types ------------------

export type TileState = {
    data: unknown
    level: number
    status: GameStatus
    ticks: number
    tiles: TileType[]
    time?: string
}

export type TileAction =
    | { type: 'TICK' }
    | { type: 'SET_STATUS'; payload: GameStatus }
    | { type: 'SET_TILES'; payload: TileType[] }
    | { type: 'RESET_TICKS' }
  
export type TileContextValue = TileState & {
    ticking: boolean
    time?: string
    emptySpace?: EmptyPosition
    scores: Score[]
    clearScores: () => void
    getSpace: (tiles: TileType[]) => EmptyPosition
    setStatus: (status: GameStatus) => void
    setTiles: (tiles: TileType[]) => void
    startTicker: () => void
    stopTicker: () => void
    tick: () => void
    resetTicks: () => void
}

// ------------------ Initial State ------------------

const initialState: TileState = {
    data: null,
    level: 4,
    status: GameStatus.IDLE,
    ticks: 0,
    tiles: [],
}

// Create Context with a partial type (we’ll cast it in the provider)
export const TileContext = createContext<TileContextValue>({} as TileContextValue)

// ------------------ Reducer ------------------

const reducer = (state: TileState, action: TileAction): TileState => {

    switch (action.type) {
        case 'TICK':
            return { ...state, ticks: state.ticks + 1 }
        case 'SET_STATUS':
            return { ...state, status: action.payload }
        case 'SET_TILES':
            return { ...state, tiles: action.payload }
        case 'RESET_TICKS':
            return { ...state, ticks: 0 }
        default:
            throw new Error(`Unhandled action type: ${(action as any).type}`)
    }
}

// ------------------ Provider ------------------

type TileProviderProps = {
    children: ReactNode
}

export const TileProvider: React.FC<TileProviderProps> = ({ children }) => {
    const { user } = useUser()
    const [state, dispatch] = useReducer(reducer, initialState)
    const [ticker, setTicker] = useState<NodeJS.Timeout | null>(null)
    const [scores, setScores] = useState<Score[]>([])
    const [savedScore, setSavedScore] = useState<string>()

    const formattedTime = useMemo(() => {
        const m = Math.floor(state.ticks / 60)
        const s = state.ticks < 60 ? state.ticks : state.ticks % 60
        return `${m > 0 ? (m < 10 ? `0${m}` : `${m}`) : `00`}:${s < 10 ? `0${s}` : s}`
    }, [state.ticks])

    const handleNewScore = async () => {
        // TODO: Implement score saving API
        // const newScore = await addNewScore(savedScore as string)
        // if (newScore) await fetchScores()
        setSavedScore(undefined)
    }

    useEffect(() => {
        if (savedScore) {
            if (user) {
                handleNewScore()
            } else {
                // TODO: Show auth modal
                console.log('User must be logged in to save score')
            }
        }
    }, [user, savedScore])

    const handleWin = async () => {
        setSavedScore(formattedTime as string)
    }

    const clearScores = async () => {
        stopTicker()
        setStatus(GameStatus.IDLE)
        // TODO: Implement clear scores API
        // await clearAllScores()
        setScores([])
    }

    const fetchScores = async () => {
        // TODO: Implement fetch scores API
        // const fetchedScores = await fetchScoresForGame()
        // if (fetchedScores) setScores(fetchedScores)
    }

    useEffect(() => {
        fetchScores()
    }, [])

    useEffect(() => {
        if (!state.status) return
        switch (state.status) {
            case GameStatus.IDLE:
                resetTicks()
                stopTicker()
                initTiles()
            break
            case GameStatus.START:
                resetTicks()
                stopTicker()
                shuffle()
            break
            case GameStatus.PLAYING:
                // resetTicks()
                startTicker()
            break
            case GameStatus.PAUSED:
                stopTicker()
            break
            case GameStatus.RESOLVED:
                resetTicks()
                stopTicker()
                handleWin()
            break
        }
    }, [state.status])

    const resolveTiles = useCallback(() => {
        if (!state.tiles?.length) return false
        let numCorrect = 0
        for (let r = 0; r < state.level; r++) {
            for (let c = 0; c < state.level; c++) {
                const tile = state.tiles.find(t => t.col === c && t.row === r)
                if (!tile || tile.id !== numCorrect) {
                    return false
                }
                if (numCorrect === state.tiles.length - 1) return true
                numCorrect++
            }
        }
    }, [state.tiles])

    useEffect(() => {
        if (state.status === GameStatus.PLAYING && resolveTiles()) {
            setStatus(GameStatus.RESOLVED)
        }
    }, [state.tiles])

    // ------------------ EmptySpace ------------------

    const getEmptyRow = (tiles: TileType[]) => {
        if (tiles) {
            for (let r = 0; r < state.level; r++) {
                const rowTiles = tiles.filter(t => t.row === r)
                if (rowTiles.length < state.level) return r
            }
        }
    }

    const getEmptyCol = (tiles: TileType[]) => {
        if (tiles) {
            for (let c = 0; c < state.level; c++) {
                const colTiles = tiles.filter(t => t.col === c)
                if (colTiles.length < state.level) return c
            }
        }
    }

    const getEmptySpace = (tiles: TileType[]) => {
        const col = getEmptyCol(tiles)
        const row = getEmptyRow(tiles)
        return { col, row } as EmptyPosition
    }

    // ------------------ Tiles ------------------

    const initTiles = () => {
        const initialTiles: TileType[] = []
        let id = 0
        for (let row = 0; row < state.level; row++) {
            for (let col = 0; col < state.level; col++) {
                initialTiles.push({ id, row, col, direction: Direction.NONE })
                id++
            }
        }

        const lastTile = initialTiles.pop()
        // let empty = { col: state.level - 1, row: state.level - 1 }
        // if (lastTile) empty = { col: lastTile.col, row: lastTile.row }
        
        setTiles(initialTiles)
    }

    const getDragDirection = (tile: TileType, emptySpace: EmptyPosition) => {
        let direction = Direction.NONE
        if (emptySpace && tile) {
            const { col, row } = emptySpace
            if (tile.col === col) {
                direction = tile.row < row ? Direction.DOWN : Direction.UP
            } else if (tile.row === row) {
                direction = tile.col < col ? Direction.RIGHT : Direction.LEFT
            }
        }
        return direction
    }
  
    const setTiles = (payload: TileType[]) => {
        const emptySpace = getEmptySpace(payload)
        const tilesWithDirection = payload.map((tile) => {
            const directionalTile = {
                ...tile,
                direction: getDragDirection(tile, emptySpace as EmptyPosition),
            }
            return directionalTile
        })
        dispatch({ type: 'SET_TILES', payload: tilesWithDirection })
        if (state.status === GameStatus.START) setStatus(GameStatus.PLAYING)
    }

    const shuffle = () => {
        const pile = [...state.tiles]
        let col = 0
        let row = 0
        const shuffled: TileType[] = []
        while (pile.length > 0) {
            const index = Math.floor(Math.random() * pile.length)
            const tile = pile.splice(index, 1)[0]
            const newTile = { ...tile, col, row }
            shuffled.push(newTile)
            col++
            if (col >= state.level) {
                col = 0
                row++
            }
        }
        
        setTiles(shuffled)
    }

    const setStatus = (payload: GameStatus) => {
        dispatch({ type: 'SET_STATUS', payload })
    }

    // ------------------ Ticker ------------------
    
    const tick = () => dispatch({ type: 'TICK' })
  
    const startTicker = () => {
        if (!ticker) {
            const interval = setInterval(tick, 1000)
            setTicker(interval)
        }
    }
  
    const stopTicker = () => {
        if (ticker) {
            clearInterval(ticker)
            setTicker(null)
        }
    }
  
    const resetTicks = () => {
        dispatch({ type: 'RESET_TICKS' })
    }
  
    useEffect(() => {
        return () => {
            if (ticker) {
                clearInterval(ticker)
            }
        }
    }, [ticker])
  
    const ticking = useMemo(() => ticker ? ticker !== null : false, [ticker])
  
    const actions = useMemo(() => ({
        clearScores,
        getSpace: getEmptySpace,
        // getSpace: (tiles: TileType[]): EmptyPosition => getEmptySpace(tiles),
        setStatus,
        setTiles,
        tick,
        startTicker,
        stopTicker,
        resetTicks,
    }), [])
  
    return (
        <TileContext.Provider
            value={{
                ...state,
                ...actions,
                // emptySpace,
                scores,
                ticking,
                time: formattedTime,
            }}
        >
            {children}
      </TileContext.Provider>
    )
}

// Custom hook to use the Tile context
export const useTiles = () => {
    const context = useContext(TileContext)
    if (!context) {
        throw new Error('useTiles must be used within a TileProvider')
    }
    return context
}

// app/ui/tile-board.tsx

"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { Direction, GameStatus, TileType } from '@/app/lib/definitions/tiles'
import { useTiles } from '@/app/lib/providers/tile-provider'

export type Dimensions = {
    width: number
    height: number
}

export default function TileBoard() {

    const {
        level,
        status,
        tiles,
        getSpace,
        setStatus,
        setTiles,
    } = useTiles()

    const containerRef = useRef<HTMLDivElement>(null)
    const [dims, setDims] = useState<Dimensions>()
    const [itemSize, setItemSize] = useState<number>()
    const [draggedTile, setDraggedTile] = useState<TileType | null>()
    const [offset, setOffset] = useState({ x: 0, y: 0 })
    const [startPos, setStartPos] = useState({ x: 0, y: 0 })
    const dragDirection = useMemo(() => draggedTile && draggedTile.direction, [draggedTile])

    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect()
                const size = Math.min(rect.width, rect.height)
                setDims({ width: size, height: size })
            }
        }

        // Initial size calculation
        handleResize()

        // Create ResizeObserver to watch for container size changes
        const resizeObserver = new ResizeObserver(() => {
            handleResize()
        })

        // Observe the container element itself
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current)
        }

        // Also listen to window resize as fallback
        window.addEventListener('resize', handleResize)

        return () => {
            resizeObserver.disconnect()
            window.removeEventListener('resize', handleResize)
        }
    }, [])

    useEffect(() => {
        if (dims) {
            setItemSize((dims.width - 2) / level)
        }
    }, [dims, level])

    useEffect(() => {
        if (draggedTile) {
            setDraggedTile(null)
            resetOffsetValue()
        }
    }, [tiles])

    const isTileDragging = useCallback((tile: TileType) => {
        const emptySpace = getSpace(tiles)
        if (!draggedTile || !emptySpace) return false
        const { col, row } = emptySpace

        let draggingTiles = tiles.filter(t => (
            t.id === draggedTile.id ||
            (draggedTile.direction === Direction.UP && t.col === col && t.row > row! && t.row < draggedTile.row) ||
            (draggedTile.direction === Direction.DOWN && t.col === col && t.row < row && t.row > draggedTile.row) ||
            (draggedTile.direction === Direction.LEFT && t.row === row && t.col > col! && t.col < draggedTile.col) ||
            (draggedTile.direction === Direction.RIGHT && t.row === row && t.col < col! && t.col > draggedTile.col)
        ))
        return draggingTiles.filter(t => t.id === tile.id).length > 0
    }, [draggedTile, tiles, getSpace])

    const getTileCoords = (tile: TileType) => {
        if (!itemSize) return null
        const { col, row } = tile
        const coords = {
            x: col * (itemSize + 1),
            y: row * (itemSize + 1),
        }
        return coords
    }

    const resetOffsetValue = () => {
        setOffset({ x: 0, y: 0 })
    }

    const finalizeMove = () => {
        const movedTiles = tiles.map(t => getMovedTile(t))
        setTiles(movedTiles)
    }

    const onTouchStart = (event: React.MouseEvent | React.TouchEvent, tile: TileType) => {
        if (status === GameStatus.PLAYING && !draggedTile && tile.direction !== Direction.NONE) {
            setDraggedTile(tile)
            const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
            const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY
            setStartPos({ x: clientX, y: clientY })
        }
    }

    const isHorizontal = useMemo(() => {
        return (dragDirection === Direction.LEFT || dragDirection === Direction.RIGHT)
    }, [dragDirection])

    const clamp = (value: number, min: number, max: number) => {
        return Math.min(Math.max(value, min), max)
    }

    const handleDrag = (clientX: number, clientY: number) => {
        if (!itemSize) return
        const translationX = clientX - startPos.x
        const translationY = clientY - startPos.y

        const newOffset = isHorizontal
            ? dragDirection === Direction.LEFT
                ? clamp(translationX, -itemSize, 0)
                : clamp(translationX, 0, itemSize)
            : dragDirection === Direction.UP
                ? clamp(translationY, -itemSize, 0)
                : clamp(translationY, 0, itemSize)

        if (isHorizontal) {
            setOffset({ x: newOffset, y: 0 })
        } else {
            setOffset({ x: 0, y: newOffset })
        }
    }

    const onTouchMove = (event: React.MouseEvent | React.TouchEvent) => {
        if (draggedTile) {
            const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
            const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY
            handleDrag(clientX, clientY)
        }
    }

    const getMovedTile = (tile: TileType) => {
        if (isTileDragging(tile)) {
            switch (tile.direction) {
                case Direction.UP: return { ...tile, row: tile.row - 1 }
                case Direction.DOWN: return { ...tile, row: tile.row + 1 }
                case Direction.LEFT: return { ...tile, col: tile.col - 1 }
                case Direction.RIGHT: return { ...tile, col: tile.col + 1 }
                default: return tile
            }
        }
        return tile
    }

    const onTileReset = () => {
        resetOffsetValue()
        setDraggedTile(null)
    }

    const moveTiles = () => {
        if (!itemSize || !draggedTile) return
        finalizeMove()
        onTileReset()
    }

    const resetTile = () => {
        onTileReset()
    }

    const handleMove = (event: React.MouseEvent | React.TouchEvent) => {
        if (!itemSize) return
        const clientX = 'changedTouches' in event ? event.changedTouches[0].clientX : event.clientX
        const clientY = 'changedTouches' in event ? event.changedTouches[0].clientY : event.clientY

        const translationX = clientX - startPos.x
        const translationY = clientY - startPos.y

        const isClick = Math.abs(translationX) < 5 && Math.abs(translationY) < 5
        if (!isClick) {
            let newValue = isHorizontal ? translationX : translationY
            const shouldMove = isClick || Math.abs(newValue) > itemSize / 2
            if (shouldMove) {
                moveTiles()
            } else {
                resetTile()
            }
        } else {
            moveTiles()
        }
    }

    const getTileColor = (tile: TileType) => {
        const draggable = tile.direction !== Direction.NONE
        switch (status) {
            case GameStatus.RESOLVED: return '#ef4444' // red
            case GameStatus.IDLE: return '#22c55e' // green
            case GameStatus.PAUSED: return '#aaa'
            case GameStatus.PLAYING: return draggable ? '#3b82f6' : '#22c55e' // blue : green
            default: return '#22c55e'
        }
    }

    const renderSquare = (tile: TileType) => {
        return itemSize && (
            <div
                className='flex flex-row items-center justify-center rounded-lg overflow-hidden'
                style={{
                    height: itemSize,
                    width: itemSize,
                    backgroundColor: getTileColor(tile),
                }}
            >
                <span className='text-lg text-white font-bold cursor-default'>
                    {tile.id + 1}
                </span>
            </div>
        )
    }

    const renderTiles = () => {
        return tiles.map((tile) => {
            const coords = getTileCoords(tile);
            if (!coords) return null;
            const draggable = status === GameStatus.PLAYING && tile.direction !== Direction.NONE;
            const dragging = isTileDragging(tile);
            const { x, y } = coords;

            const transform = dragging
                ? `translate(${offset.x}px, ${offset.y}px)`
                : 'translate(0, 0)';

            return (
                <div
                    key={tile.id}
                    style={{
                        position: 'absolute',
                        top: y,
                        left: x,
                        transform,
                        transition: dragging ? 'none' : 'transform 0.1s ease',
                        cursor: draggable ? 'pointer' : 'auto',
                    }}
                    className="rounded-md overflow-hidden"
                    onMouseDown={(e) => onTouchStart(e, tile)}
                    onMouseMove={onTouchMove}
                    onMouseUp={handleMove}
                    onTouchStart={(e) => onTouchStart(e, tile)}
                    onTouchMove={onTouchMove}
                    onTouchEnd={handleMove}
                >
                    {renderSquare(tile)}
                </div>
            )
        })
    }

    return (
        <div ref={containerRef} className='w-full h-full'>
            {tiles && (
                <div className="relative w-full h-full rounded-md">
                    {renderTiles()}
                </div>
            )}
        </div>
    )
}

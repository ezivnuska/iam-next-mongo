'use client';

import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';

import type { Cell, CollisionContext } from './types';
import {
    CELL_TYPE,
    COLLISION_COOLDOWN,
    ABSORBER_SHRINK_RATE,
    ABSORBER_MIN_RADIUS,
    getCellConfig,
} from './constants';
import { resolveCollision } from './collision';
import { createCell, getInitialCellCount, generateInitialCells } from './helpers';

interface PetriDishProps {
    className?: string;
}

export default function PetriDish({ className = '' }: PetriDishProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const statsCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const cellsRef = useRef<Cell[]>([]);
    const nextIdRef = useRef(getInitialCellCount());

    const [isPaused, setIsPaused] = useState(false);
    const isPausedRef = useRef(isPaused);

    useEffect(() => {
        isPausedRef.current = isPaused;
    }, [isPaused]);

    const spawnCell = (type: number) => {
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const width = rect.width || 800;
        const height = rect.height || 500;

        const newCell = createCell(type, nextIdRef.current, width, height);
        nextIdRef.current++;
        cellsRef.current.push(newCell);
    };

    const restart = () => {
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const width = rect.width || 800;
        const height = rect.height || 500;

        nextIdRef.current = getInitialCellCount();
        cellsRef.current = generateInitialCells(width, height);
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resizeCanvas = () => {
            const rect = container.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        const rect = container.getBoundingClientRect();
        const width = rect.width || 800;
        const height = rect.height || 500;

        cellsRef.current = generateInitialCells(width, height);

        let animationFrameId: number;

        const draw = () => {
            if (!canvas) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const drawCell = (cell: Cell) => {
                ctx.beginPath();
                ctx.arc(cell.x, cell.y, cell.radius, 0, Math.PI * 2);
                ctx.fillStyle = cell.color;
                ctx.fill();

                const config = getCellConfig(cell.type);
                ctx.strokeStyle = config.stroke.color;
                ctx.lineWidth = config.stroke.width;
                ctx.setLineDash(config.stroke.dash);
                ctx.stroke();
                ctx.setLineDash([]);
            };

            if (isPausedRef.current) {
                cellsRef.current.forEach(drawCell);
                animationFrameId = requestAnimationFrame(draw);
                return;
            }

            const currentTime = Date.now();

            const updatedCells = cellsRef.current.map(cell => {
                let newX = cell.x + cell.vx;
                let newY = cell.y + cell.vy;
                let newVx = cell.vx;
                let newVy = cell.vy;
                let newRadius = cell.radius;
                let newMass = cell.mass;

                if (cell.type === CELL_TYPE.ABSORBER && ABSORBER_SHRINK_RATE > 0) {
                    newRadius = Math.max(cell.radius - ABSORBER_SHRINK_RATE, 0);
                    newMass = newRadius;
                }

                if (newX - newRadius < 0 || newX + newRadius > canvas.width) {
                    newVx = -newVx;
                    newX = cell.x + newVx;
                }
                if (newY - newRadius < 0 || newY + newRadius > canvas.height) {
                    newVy = -newVy;
                    newY = cell.y + newVy;
                }

                return {
                    ...cell,
                    x: newX,
                    y: newY,
                    vx: newVx,
                    vy: newVy,
                    radius: newRadius,
                    mass: newMass,
                };
            }).filter(cell => {
                if (cell.type === CELL_TYPE.ABSORBER && cell.radius < ABSORBER_MIN_RADIUS) {
                    return false;
                }
                return true;
            });

            const cellsToRemove = new Set<number>();
            const newCells: Cell[] = [];
            const cellsToUpdate = new Map<number, Partial<Cell>>();
            const processedPairs = new Set<string>();
            let currentNextId = nextIdRef.current;

            for (let i = 0; i < updatedCells.length; i++) {
                for (let j = i + 1; j < updatedCells.length; j++) {
                    const cell1 = updatedCells[i];
                    const cell2 = updatedCells[j];
                    const pairKey = `${cell1.id}-${cell2.id}`;

                    if (processedPairs.has(pairKey) || cellsToRemove.has(cell1.id) || cellsToRemove.has(cell2.id)) {
                        continue;
                    }

                    const dx = cell1.x - cell2.x;
                    const dy = cell1.y - cell2.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const areTouching = distance < (cell1.radius + cell2.radius);

                    if (!areTouching) continue;

                    const cell1InCooldown = currentTime - cell1.lastCollision < COLLISION_COOLDOWN;
                    const cell2InCooldown = currentTime - cell2.lastCollision < COLLISION_COOLDOWN;
                    if (cell1InCooldown || cell2InCooldown) continue;

                    processedPairs.add(pairKey);

                    const collisionCtx: CollisionContext = {
                        cell1,
                        cell2,
                        distance,
                        dx,
                        dy,
                        currentTime,
                        nextId: currentNextId,
                        totalCells: updatedCells.length + newCells.length,
                    };

                    const result = resolveCollision(collisionCtx);

                    result.removeIds.forEach(id => cellsToRemove.add(id));
                    result.newCells.forEach(cell => {
                        newCells.push(cell);
                        currentNextId++;
                    });
                    result.updates.forEach((update, id) => {
                        const existing = cellsToUpdate.get(id) || {};
                        cellsToUpdate.set(id, { ...existing, ...update });
                    });

                    if (result.newCells.length > 0) {
                        currentNextId = Math.max(currentNextId, ...result.newCells.map(c => c.id + 1));
                    }
                }
            }

            nextIdRef.current = currentNextId;

            if (cellsToRemove.size > 0 || cellsToUpdate.size > 0 || newCells.length > 0) {
                const remainingCells = updatedCells.filter(cell => !cellsToRemove.has(cell.id));
                const finalCells = remainingCells.map(cell => {
                    const update = cellsToUpdate.get(cell.id);
                    return update ? { ...cell, ...update } : cell;
                });
                cellsRef.current = [...finalCells, ...newCells];
            } else {
                cellsRef.current = updatedCells;
            }

            cellsRef.current.forEach(drawCell);

            // Draw stats bar chart on stats canvas
            const statsCanvas = statsCanvasRef.current;
            if (statsCanvas) {
                const statsCtx = statsCanvas.getContext('2d');
                if (statsCtx) {
                    statsCtx.clearRect(0, 0, statsCanvas.width, statsCanvas.height);

                    // Count cells by type
                    const counts: Record<number, number> = {};
                    cellsRef.current.forEach(cell => {
                        counts[cell.type] = (counts[cell.type] || 0) + 1;
                    });

                    const cellTypes = [
                        { type: CELL_TYPE.FOOD, label: 'F' },
                        { type: CELL_TYPE.POISON, label: 'P' },
                    ];

                    const padding = 10;
                    const barWidth = (statsCanvas.width - padding * 2) / cellTypes.length - 10;
                    const maxBarHeight = statsCanvas.height - 30;
                    const maxCount = Math.max(...Object.values(counts), 1);

                    cellTypes.forEach(({ type, label }, index) => {
                        const config = getCellConfig(type);
                        const count = counts[type] || 0;
                        const barHeight = (count / maxCount) * maxBarHeight;
                        const x = padding + index * (barWidth + 10);
                        const y = statsCanvas.height - barHeight - 20;

                        // Draw bar
                        statsCtx.fillStyle = config.color;
                        statsCtx.fillRect(x, y, barWidth, barHeight);

                        // Draw bar border
                        statsCtx.strokeStyle = config.stroke.color;
                        statsCtx.lineWidth = 2;
                        statsCtx.strokeRect(x, y, barWidth, barHeight);

                        // Draw label below bar
                        statsCtx.font = '12px monospace';
                        statsCtx.fillStyle = '#ffffff';
                        statsCtx.textAlign = 'center';
                        statsCtx.fillText(label, x + barWidth / 2, statsCanvas.height - 5);

                        // Draw count above bar
                        statsCtx.fillStyle = '#cccccc';
                        statsCtx.fillText(count.toString(), x + barWidth / 2, y - 5);
                    });

                    statsCtx.textAlign = 'left';
                }
            }

            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div className={clsx('flex w-full flex-col', { [className]: className })}>
            <div className="flex flex-col bg-gray-800 border border-gray-700 rounded-t">
                <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-700">
                    <button
                        onClick={() => setIsPaused(!isPaused)}
                        className={clsx(
                            'px-3 py-1 text-sm font-medium rounded transition-colors',
                            isPaused
                                ? 'bg-green-600 hover:bg-green-500 text-white'
                                : 'bg-yellow-600 hover:bg-yellow-500 text-white'
                        )}
                    >
                        {isPaused ? '▶ Resume' : '⏸ Pause'}
                    </button>
                    <button
                        onClick={restart}
                        className="px-3 py-1 text-sm font-medium rounded bg-gray-600 hover:bg-gray-500 text-white transition-colors"
                        title="Restart simulation"
                    >
                        ↻ Restart
                    </button>
                </div>

                {/* <div className="flex items-center gap-3 px-3 py-2">
                    <span className="text-xs text-gray-400">Add:</span>
                    <button
                        onClick={() => spawnCell(CELL_TYPE.ABSORBER)}
                        className="px-2 py-1 text-xs font-medium rounded bg-red-700 hover:bg-red-600 text-white transition-colors"
                        title="Absorber - absorbs smaller prey"
                    >
                        + Absorber
                    </button>
                    <button
                        onClick={() => spawnCell(1)}
                        className="px-2 py-1 text-xs font-medium rounded bg-green-600 hover:bg-green-500 text-white transition-colors"
                        title="Spawn prey cell"
                    >
                        + Prey
                    </button>
                </div> */}
            </div>

            <div className="bg-gray-800 border-x border-gray-700 px-2 py-2">
                <canvas
                    ref={statsCanvasRef}
                    width={600}
                    height={100}
                    className="w-full"
                />
            </div>

            <div
                ref={containerRef}
                className="flex flex-1 min-h-[500px] border border-red-500 border-t-0 bg-gray-900"
            >
                <canvas
                    ref={canvasRef}
                    className='w-full h-full'
                />
            </div>
        </div>
    );
}

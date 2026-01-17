// app/ui/petri-dish.tsx

'use client';

import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';

interface PetriDishProps {
    className?: string;
}

// Cell Type Enum
enum CellType {
    SPLITTER = 'SPLITTER',      // Can split on equal collision
    ABSORBER = 'ABSORBER',       // Always absorbs smaller cells
    HYBRID = 'HYBRID',           // Can both split and absorb
    NEUTRAL = 'NEUTRAL',         // Cannot interact (passes through)
}

// Base Cell Interface - common properties for all cells
interface BaseCell {
    x: number;
    y: number;
    radius: number;
    vx: number; // velocity x
    vy: number; // velocity y
    id: number; // unique identifier
    lastCollision: number; // timestamp of last collision (for cooldown)
    type: CellType;
}

// Splitter Cell - can split when colliding with equal-sized cells
interface SplitterCell extends BaseCell {
    type: CellType.SPLITTER;
    color: string;
}

// Absorber Cell - always absorbs smaller cells, cannot split
interface AbsorberCell extends BaseCell {
    type: CellType.ABSORBER;
    color: string;
    mass: number; // accumulated mass from absorbed cells
    speedMultiplier: number; // affects velocity
}

// Hybrid Cell - can both split and absorb based on conditions
interface HybridCell extends BaseCell {
    type: CellType.HYBRID;
    color: string;
    mass: number;
}

// Neutral Cell - passes through others without interaction
interface NeutralCell extends BaseCell {
    type: CellType.NEUTRAL;
    color: string;
}

// Union type for all cell types
type Cell = SplitterCell | AbsorberCell | HybridCell | NeutralCell;

// Type guard functions
const isSplitterCell = (cell: Cell): cell is SplitterCell => cell.type === CellType.SPLITTER;
const isAbsorberCell = (cell: Cell): cell is AbsorberCell => cell.type === CellType.ABSORBER;
const isHybridCell = (cell: Cell): cell is HybridCell => cell.type === CellType.HYBRID;
const isNeutralCell = (cell: Cell): cell is NeutralCell => cell.type === CellType.NEUTRAL;

// Constants
const RADIUS_TOLERANCE = 0.5; // Cells within this radius difference are considered equal
const COLLISION_COOLDOWN = 500; // ms cooldown after splitting/absorbing
const MAX_CELLS = 200; // Maximum number of cells before preventing further splits
const MIN_CELL_RADIUS = 5; // Minimum radius - cells at or below this cannot split
const SPLIT_VELOCITY_OFFSET = 0.5; // Velocity change when cells split
const SPLIT_RADIUS_DIVISOR = 2; // New cell radius = parent radius / this value
const SPLIT_OFFSET_MULTIPLIER = 1.5; // Distance between split cells
const SPLIT_CELL_COUNT = 2; // Number of new cells created when a cell splits
const ABSORBER_SHRINK_RATE = 0.03; // Radius decrease per frame for absorber cells (0 = no shrinking)
const ABSORBER_MIN_RADIUS = 2; // Minimum radius before absorber is removed
const NEUTRAL_DAMAGE = 1.5; // Radius decrease when neutral cell hits absorber

// Standard colors for each cell type
const CELL_COLORS = {
    [CellType.SPLITTER]: '#4ade80',   // green - can split
    [CellType.ABSORBER]: '#f87171',   // red - absorbs smaller cells
    [CellType.HYBRID]: '#fbbf24',     // yellow - can split and absorb
    [CellType.NEUTRAL]: '#60a5fa',    // blue - passes through everything
} as const;

// Standard radii for each cell type
const CELL_RADII = {
    [CellType.SPLITTER]: 12,   // Medium size
    [CellType.ABSORBER]: 30,   // Larger for absorbing
    [CellType.HYBRID]: 10,     // Smaller, more agile
    [CellType.NEUTRAL]: 8,     // Smallest, fastest
} as const;

// Standard velocity ranges for each cell type
const CELL_VELOCITY_RANGES = {
    [CellType.SPLITTER]: { min: 0.5, max: 2.5 },   // Moderate speed
    [CellType.ABSORBER]: { min: 1.5, max: 3.5 },   // Faster for hunting
    [CellType.HYBRID]: { min: 1.0, max: 3.0 },     // Balanced speed
    [CellType.NEUTRAL]: { min: 2.0, max: 4.0 },    // Fast (passes through)
} as const;

// Standard speed multipliers for each cell type
const CELL_SPEED_MULTIPLIERS = {
    [CellType.SPLITTER]: 1.0,    // Standard speed
    [CellType.ABSORBER]: 1.0,    // Standard speed
    [CellType.HYBRID]: 1.0,      // Standard speed
    [CellType.NEUTRAL]: 1.0,     // Standard speed
} as const;

// Initial cell counts per type - define how many of each cell type to spawn
const INITIAL_CELL_COUNTS: Record<CellType, number> = {
    [CellType.SPLITTER]: 0,
    [CellType.ABSORBER]: 1,
    [CellType.HYBRID]: 30,
    [CellType.NEUTRAL]: 2,
};

// Helper to get total initial cell count
const getInitialCellCount = () =>
    Object.values(INITIAL_CELL_COUNTS).reduce((sum, count) => sum + count, 0);

// Helper to generate initial cells from counts config
const generateInitialCells = (width: number, height: number): Cell[] => {
    const cells: Cell[] = [];
    let id = 0;

    for (const type of Object.values(CellType)) {
        const count = INITIAL_CELL_COUNTS[type];
        for (let i = 0; i < count; i++) {
            cells.push(createCell(type, id++, width, height));
        }
    }

    return cells;
};

// Helper function to check collision between two cells
const checkCollision = (cell1: Cell, cell2: Cell, currentTime: number): boolean => {
    // NEUTRAL cells never collide - they pass through everything
    if (isNeutralCell(cell1) || isNeutralCell(cell2)) {
        return false;
    }

    // Check if either cell is in cooldown period after splitting/absorbing
    if (currentTime - cell1.lastCollision < COLLISION_COOLDOWN || currentTime - cell2.lastCollision < COLLISION_COOLDOWN) {
        return false;
    }

    // Check if cells are actually touching
    const dx = cell1.x - cell2.x;
    const dy = cell1.y - cell2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance >= (cell1.radius + cell2.radius)) {
        return false;
    }

    // Check if cells have equal radii for potential splitting
    const radiiEqual = Math.abs(cell1.radius - cell2.radius) < RADIUS_TOLERANCE;

    // SPLITTER cells can only split if radii are equal
    if (isSplitterCell(cell1) && isSplitterCell(cell2)) {
        return radiiEqual;
    }

    // ABSORBER cells can only absorb (different radii)
    if (isAbsorberCell(cell1) || isAbsorberCell(cell2)) {
        return !radiiEqual; // Only collide if radii are different
    }

    // HYBRID cells can both split and absorb
    if (isHybridCell(cell1) && isHybridCell(cell2)) {
        return true; // Can split (equal radii) or absorb (different radii)
    }

    // Mixed types: SPLITTER + ABSORBER/HYBRID
    if (isSplitterCell(cell1) || isSplitterCell(cell2)) {
        // Splitters can only split with equal radii, otherwise no collision
        return radiiEqual;
    }

    return true;
};

// Helper function to calculate elastic collision between two cells
const calculateElasticCollision = (cell1: Cell, cell2: Cell): { vx1: number; vy1: number; vx2: number; vy2: number } => {
    // Calculate collision normal (unit vector from cell1 to cell2)
    const dx = cell2.x - cell1.x;
    const dy = cell2.y - cell1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) {
        // Cells are at same position, push them apart
        return {
            vx1: -cell1.vx,
            vy1: -cell1.vy,
            vx2: -cell2.vx,
            vy2: -cell2.vy,
        };
    }

    const nx = dx / distance;
    const ny = dy / distance;

    // Relative velocity
    const dvx = cell1.vx - cell2.vx;
    const dvy = cell1.vy - cell2.vy;

    // Relative velocity in collision normal direction
    const dvn = dvx * nx + dvy * ny;

    // Don't apply collision if cells are moving apart
    if (dvn <= 0) {
        return { vx1: cell1.vx, vy1: cell1.vy, vx2: cell2.vx, vy2: cell2.vy };
    }

    // Mass is proportional to radius squared (area)
    const mass1 = cell1.radius * cell1.radius;
    const mass2 = cell2.radius * cell2.radius;

    // Calculate impulse scalar for elastic collision
    const impulse = (2 * dvn) / (mass1 + mass2);

    // Update velocities
    return {
        vx1: cell1.vx - impulse * mass2 * nx,
        vy1: cell1.vy - impulse * mass2 * ny,
        vx2: cell2.vx + impulse * mass1 * nx,
        vy2: cell2.vy + impulse * mass1 * ny,
    };
};

// Helper function to get random position within bounds accounting for radius
const getRandomPosition = (radius: number, max: number) => {
    return radius + Math.random() * (max - radius * 2);
};

// Helper function to get random velocity within range (can be positive or negative)
const getRandomVelocity = (min: number, max: number) => {
    const magnitude = min + Math.random() * (max - min);
    return Math.random() < 0.5 ? magnitude : -magnitude;
};

// Helper function to create a new cell of a given type
const createCell = (type: CellType, id: number, width: number, height: number): Cell => {
    const radius = CELL_RADII[type];
    const velocityRange = CELL_VELOCITY_RANGES[type];
    const baseCell = {
        id,
        x: getRandomPosition(radius, width),
        y: getRandomPosition(radius, height),
        radius,
        color: CELL_COLORS[type],
        vx: getRandomVelocity(velocityRange.min, velocityRange.max),
        vy: getRandomVelocity(velocityRange.min, velocityRange.max),
        lastCollision: 0,
    };

    switch (type) {
        case CellType.SPLITTER:
            return { ...baseCell, type: CellType.SPLITTER } as SplitterCell;
        case CellType.ABSORBER:
            return {
                ...baseCell,
                type: CellType.ABSORBER,
                mass: radius,
                speedMultiplier: CELL_SPEED_MULTIPLIERS[CellType.ABSORBER],
            } as AbsorberCell;
        case CellType.HYBRID:
            return { ...baseCell, type: CellType.HYBRID, mass: radius } as HybridCell;
        case CellType.NEUTRAL:
            return { ...baseCell, type: CellType.NEUTRAL } as NeutralCell;
    }
};

// Helper function to create smaller cells from one cell (count based on SPLIT_CELL_COUNT)
const splitCell = (cell: Cell, nextId: number, currentTime: number): Cell[] => {
    const newRadius = cell.radius / SPLIT_RADIUS_DIVISOR;
    const offset = newRadius * SPLIT_OFFSET_MULTIPLIER;

    // Generate positions in a circle around the parent cell
    const baseProps = Array.from({ length: SPLIT_CELL_COUNT }, (_, i) => {
        const angle = (2 * Math.PI * i) / SPLIT_CELL_COUNT;
        return {
            x: cell.x + Math.cos(angle) * offset,
            y: cell.y + Math.sin(angle) * offset,
            vx: cell.vx + Math.cos(angle) * SPLIT_VELOCITY_OFFSET,
            vy: cell.vy + Math.sin(angle) * SPLIT_VELOCITY_OFFSET,
        };
    });

    // Create cells based on parent type
    if (isSplitterCell(cell)) {
        return baseProps.map((props, index) => ({
            type: CellType.SPLITTER,
            id: nextId + index,
            radius: newRadius,
            color: cell.color,
            lastCollision: currentTime,
            ...props,
        }));
    }

    if (isHybridCell(cell)) {
        return baseProps.map((props, index) => ({
            type: CellType.HYBRID,
            id: nextId + index,
            radius: newRadius,
            color: cell.color,
            lastCollision: currentTime,
            mass: cell.mass / SPLIT_CELL_COUNT, // Distribute mass evenly
            ...props,
        }));
    }

    // ABSORBER and NEUTRAL cells shouldn't split, but handle them gracefully
    throw new Error(`Cannot split cell of type ${cell.type}`);
};

export default function PetriDish({ className = '' }: PetriDishProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const cellsRef = useRef<Cell[]>([]);
    const nextIdRef = useRef(getInitialCellCount()); // Start ID after initial cells

    // Pause state
    const [isPaused, setIsPaused] = useState(false);
    const isPausedRef = useRef(isPaused);

    // Keep ref in sync with state for use in animation loop
    useEffect(() => {
        isPausedRef.current = isPaused;
    }, [isPaused]);

    // Spawn a new cell of the given type
    const spawnCell = (type: CellType) => {
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const width = rect.width || 800;
        const height = rect.height || 500;

        const newCell = createCell(type, nextIdRef.current, width, height);
        nextIdRef.current++;
        cellsRef.current.push(newCell);
    };

    // Restart simulation with initial configuration
    const restart = () => {
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const width = rect.width || 800;
        const height = rect.height || 500;

        // Reset ID counter and recreate initial cells
        nextIdRef.current = getInitialCellCount();
        cellsRef.current = generateInitialCells(width, height);
    };

    // Initialize and draw cells on canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size to match container
        const resizeCanvas = () => {
            const rect = container.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Initialize cells
        const rect = container.getBoundingClientRect();
        const width = rect.width || 800;
        const height = rect.height || 500;

        // Initialize cells from counts configuration
        cellsRef.current = generateInitialCells(width, height);

        // Animation loop
        let animationFrameId: number;

        const draw = () => {
            if (!canvas) return;

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Skip updates when paused, but still draw
            if (isPausedRef.current) {
                // Draw all cells without updating
                cellsRef.current.forEach(cell => {
                    ctx.beginPath();
                    ctx.arc(cell.x, cell.y, cell.radius, 0, Math.PI * 2);
                    ctx.fillStyle = cell.color;
                    ctx.fill();

                    if (isSplitterCell(cell)) {
                        ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)';
                        ctx.lineWidth = 2;
                    } else if (isAbsorberCell(cell)) {
                        ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
                        ctx.lineWidth = 3;
                    } else if (isHybridCell(cell)) {
                        ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)';
                        ctx.lineWidth = 2;
                        ctx.setLineDash([5, 3]);
                    } else {
                        ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
                        ctx.lineWidth = 1;
                    }
                    ctx.stroke();
                    ctx.setLineDash([]);
                });

                animationFrameId = requestAnimationFrame(draw);
                return;
            }

            // Get current time for collision cooldown
            const currentTime = Date.now();

            // Update positions and apply absorber shrinking
            const updatedCells = cellsRef.current.map(cell => {
                // Update position
                let newX = cell.x + cell.vx;
                let newY = cell.y + cell.vy;
                let newVx = cell.vx;
                let newVy = cell.vy;
                let newRadius = cell.radius;

                // Shrink absorber cells over time
                if (isAbsorberCell(cell) && ABSORBER_SHRINK_RATE > 0) {
                    newRadius = Math.max(cell.radius - ABSORBER_SHRINK_RATE, 0);
                }

                // Bounce off walls (use current radius for wall detection)
                if (newX - newRadius < 0 || newX + newRadius > canvas.width) {
                    newVx = -newVx;
                    newX = cell.x + newVx;
                }
                if (newY - newRadius < 0 || newY + newRadius > canvas.height) {
                    newVy = -newVy;
                    newY = cell.y + newVy;
                }

                // Return updated cell with new radius for absorbers
                if (isAbsorberCell(cell)) {
                    return {
                        ...cell,
                        x: newX,
                        y: newY,
                        vx: newVx,
                        vy: newVy,
                        radius: newRadius,
                        mass: newRadius, // Update mass to match radius
                    };
                }

                return {
                    ...cell,
                    x: newX,
                    y: newY,
                    vx: newVx,
                    vy: newVy,
                };
            }).filter(cell => {
                // Remove absorber cells that are too small
                if (isAbsorberCell(cell) && cell.radius < ABSORBER_MIN_RADIUS) {
                    return false;
                }
                return true;
            });

            // Check for collisions
            const cellsToRemove = new Set<number>();
            const newCells: Cell[] = [];
            const cellsToUpdate = new Map<number, Cell>();
            const collisionPairs = new Set<string>(); // Track which pairs have split/absorbed

            for (let i = 0; i < updatedCells.length; i++) {
                for (let j = i + 1; j < updatedCells.length; j++) {
                    const cell1 = updatedCells[i];
                    const cell2 = updatedCells[j];

                    // Check if cells are physically touching
                    const dx = cell1.x - cell2.x;
                    const dy = cell1.y - cell2.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const areTouching = distance < (cell1.radius + cell2.radius);

                    if (checkCollision(cell1, cell2, currentTime)) {
                        // Mark this pair as having split/absorbed
                        collisionPairs.add(`${cell1.id}-${cell2.id}`);

                        // Check if cells have equal radii (splitting behavior)
                        const radiiEqual = Math.abs(cell1.radius - cell2.radius) < RADIUS_TOLERANCE;

                        if (radiiEqual) {
                            // Check if cells can split (must be above MIN_CELL_RADIUS)
                            const canSplit = cell1.radius > MIN_CELL_RADIUS && cell2.radius > MIN_CELL_RADIUS;

                            // Check if we've reached the cell limit (2 cells become 2*SPLIT_CELL_COUNT)
                            const netCellIncrease = 2 * SPLIT_CELL_COUNT - 2;
                            if (canSplit && updatedCells.length + netCellIncrease <= MAX_CELLS) {
                                // Equal radii: split both cells
                                cellsToRemove.add(cell1.id);
                                cellsToRemove.add(cell2.id);

                                const splitCells1 = splitCell(cell1, nextIdRef.current, currentTime);
                                nextIdRef.current += SPLIT_CELL_COUNT;

                                const splitCells2 = splitCell(cell2, nextIdRef.current, currentTime);
                                nextIdRef.current += SPLIT_CELL_COUNT;

                                newCells.push(...splitCells1, ...splitCells2);
                            }
                            // If at limit or too small, cells just pass through each other
                        } else {
                            // Different radii: larger absorbs smaller (with special case for hybrid vs absorber)
                            const largerCell = cell1.radius > cell2.radius ? cell1 : cell2;
                            const smallerCell = cell1.radius > cell2.radius ? cell2 : cell1;

                            // Special case: Hybrid cell contacting smaller Absorber → Hybrid splits, Absorber remains
                            if (isHybridCell(largerCell) && isAbsorberCell(smallerCell)) {
                                const canSplit = largerCell.radius > MIN_CELL_RADIUS;
                                const netIncrease = SPLIT_CELL_COUNT - 1; // 1 cell becomes SPLIT_CELL_COUNT

                                if (canSplit && updatedCells.length + netIncrease <= MAX_CELLS) {
                                    // Remove only the hybrid cell (it splits)
                                    cellsToRemove.add(largerCell.id);

                                    // Hybrid splits, absorber remains unchanged
                                    const splitCells = splitCell(largerCell, nextIdRef.current, currentTime);
                                    nextIdRef.current += SPLIT_CELL_COUNT;
                                    newCells.push(...splitCells);

                                    // Update absorber's lastCollision to trigger cooldown
                                    cellsToUpdate.set(smallerCell.id, {
                                        ...smallerCell,
                                        lastCollision: currentTime,
                                    });
                                }
                                // If can't split, just bounce (handled by elastic collision below)
                            } else {
                                // Normal absorption: larger absorbs smaller
                                cellsToRemove.add(smallerCell.id);

                                // Update larger cell based on its type
                                let updatedCell: Cell;

                                if (isAbsorberCell(largerCell)) {
                                    updatedCell = {
                                        ...largerCell,
                                        radius: largerCell.radius + smallerCell.radius * 0.5,
                                        mass: largerCell.mass + smallerCell.radius,
                                        lastCollision: currentTime,
                                    };
                                } else if (isHybridCell(largerCell)) {
                                    updatedCell = {
                                        ...largerCell,
                                        radius: largerCell.radius + smallerCell.radius * 0.5,
                                        mass: largerCell.mass + smallerCell.radius,
                                        lastCollision: currentTime,
                                    };
                                } else {
                                    // Shouldn't happen as SPLITTER and NEUTRAL don't absorb, but handle gracefully
                                    updatedCell = {
                                        ...largerCell,
                                        lastCollision: currentTime,
                                    };
                                }

                                cellsToUpdate.set(largerCell.id, updatedCell);
                            }
                        }
                    } else if (areTouching && !cellsToRemove.has(cell1.id) && !cellsToRemove.has(cell2.id)) {
                        // Cells are touching but not splitting/absorbing - apply elastic collision
                        const pairKey = `${cell1.id}-${cell2.id}`;
                        if (!collisionPairs.has(pairKey)) {
                            const { vx1, vy1, vx2, vy2 } = calculateElasticCollision(cell1, cell2);

                            // Calculate position separation to prevent overlap
                            const overlap = (cell1.radius + cell2.radius) - distance;
                            const separationX = overlap > 0 ? (dx / distance) * overlap : 0;
                            const separationY = overlap > 0 ? (dy / distance) * overlap : 0;

                            // Mass-weighted separation (lighter cells move more)
                            const mass1 = cell1.radius * cell1.radius;
                            const mass2 = cell2.radius * cell2.radius;
                            const totalMass = mass1 + mass2;
                            const ratio1 = mass2 / totalMass;
                            const ratio2 = mass1 / totalMass;

                            // Update velocities and positions for both cells
                            const updated1 = cellsToUpdate.get(cell1.id) || cell1;
                            const updated2 = cellsToUpdate.get(cell2.id) || cell2;

                            cellsToUpdate.set(cell1.id, {
                                ...updated1,
                                x: updated1.x + separationX * ratio1,
                                y: updated1.y + separationY * ratio1,
                                vx: vx1,
                                vy: vy1,
                            });
                            cellsToUpdate.set(cell2.id, {
                                ...updated2,
                                x: updated2.x - separationX * ratio2,
                                y: updated2.y - separationY * ratio2,
                                vx: vx2,
                                vy: vy2,
                            });
                        }
                    }

                    // Special case: Neutral cell touching Absorber - shrink the absorber
                    if (areTouching) {
                        const neutralCell = isNeutralCell(cell1) ? cell1 : isNeutralCell(cell2) ? cell2 : null;
                        const absorberCell = isAbsorberCell(cell1) ? cell1 : isAbsorberCell(cell2) ? cell2 : null;

                        if (neutralCell && absorberCell) {
                            // Check cooldown to prevent rapid shrinking
                            if (currentTime - absorberCell.lastCollision >= COLLISION_COOLDOWN) {
                                const existingUpdate = cellsToUpdate.get(absorberCell.id);
                                const currentAbsorber = existingUpdate || absorberCell;
                                const newRadius = Math.max(currentAbsorber.radius - NEUTRAL_DAMAGE, ABSORBER_MIN_RADIUS);

                                cellsToUpdate.set(absorberCell.id, {
                                    ...currentAbsorber,
                                    radius: newRadius,
                                    mass: newRadius,
                                    lastCollision: currentTime,
                                } as AbsorberCell);
                            }
                        }
                    }
                }
            }

            // Apply updates
            if (cellsToRemove.size > 0 || cellsToUpdate.size > 0 || newCells.length > 0) {
                // Filter out removed cells
                const remainingCells = updatedCells.filter(cell => !cellsToRemove.has(cell.id));

                // Apply updates to cells that have them
                const finalCells = remainingCells.map(cell => {
                    const update = cellsToUpdate.get(cell.id);
                    return update ? update : cell;
                });

                // Add any new cells from splitting
                cellsRef.current = [...finalCells, ...newCells];
            } else {
                cellsRef.current = updatedCells;
            }

            // Draw all cells with type-specific stroke styles
            cellsRef.current.forEach(cell => {
                ctx.beginPath();
                ctx.arc(cell.x, cell.y, cell.radius, 0, Math.PI * 2);
                ctx.fillStyle = cell.color;
                ctx.fill();

                // Apply type-specific stroke styles
                if (isSplitterCell(cell)) {
                    ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)'; // green
                    ctx.lineWidth = 2;
                } else if (isAbsorberCell(cell)) {
                    ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)'; // red
                    ctx.lineWidth = 3;
                } else if (isHybridCell(cell)) {
                    ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)'; // yellow
                    ctx.lineWidth = 2;
                    ctx.setLineDash([5, 3]); // dashed for hybrid
                } else {
                    ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)'; // blue, lighter
                    ctx.lineWidth = 1;
                }
                ctx.stroke();
                ctx.setLineDash([]); // reset dash
            });

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
            {/* Control Panel */}
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-800 border border-gray-700 rounded-t">
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

                <div className="w-px h-5 bg-gray-600" />

                <span className="text-xs text-gray-400">Add:</span>
                <button
                    onClick={() => spawnCell(CellType.SPLITTER)}
                    className="px-2 py-1 text-xs font-medium rounded bg-green-700 hover:bg-green-600 text-white transition-colors"
                    title="Splitter - splits on equal collision"
                >
                    + Splitter
                </button>
                <button
                    onClick={() => spawnCell(CellType.ABSORBER)}
                    className="px-2 py-1 text-xs font-medium rounded bg-red-700 hover:bg-red-600 text-white transition-colors"
                    title="Absorber - absorbs smaller cells"
                >
                    + Absorber
                </button>
                <button
                    onClick={() => spawnCell(CellType.HYBRID)}
                    className="px-2 py-1 text-xs font-medium rounded bg-yellow-600 hover:bg-yellow-500 text-white transition-colors"
                    title="Hybrid - can split and absorb"
                >
                    + Hybrid
                </button>
                <button
                    onClick={() => spawnCell(CellType.NEUTRAL)}
                    className="px-2 py-1 text-xs font-medium rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                    title="Neutral - passes through all cells"
                >
                    + Neutral
                </button>
            </div>

            {/* Canvas Container */}
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

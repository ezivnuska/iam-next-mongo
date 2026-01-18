import type { Cell } from './types';
import {
    CELL_TYPE,
    getCellConfig,
    INITIAL_CELL_COUNTS,
} from './constants';

// Get random position within bounds accounting for radius
const getRandomPosition = (radius: number, max: number) => {
    return radius + Math.random() * (max - radius * 2);
};

// Get random velocity within range (can be positive or negative)
const getRandomVelocity = (min: number, max: number) => {
    const magnitude = min + Math.random() * (max - min);
    return Math.random() < 0.5 ? magnitude : -magnitude;
};

// Create a new cell of a given type
export const createCell = (type: number, id: number, width: number, height: number): Cell => {
    const config = getCellConfig(type);

    return {
        id,
        type,
        x: getRandomPosition(config.radius, width),
        y: getRandomPosition(config.radius, height),
        radius: config.radius,
        color: config.color,
        vx: getRandomVelocity(config.velocity.min, config.velocity.max),
        vy: getRandomVelocity(config.velocity.min, config.velocity.max),
        mass: config.radius,
        lastCollision: 0,
    };
};

// Get total initial cell count
export const getInitialCellCount = () =>
    Object.values(INITIAL_CELL_COUNTS).reduce((sum, count) => sum + count, 0);

// Generate initial cells from counts config
export const generateInitialCells = (width: number, height: number): Cell[] => {
    const cells: Cell[] = [];
    let id = 0;

    for (const [typeStr, count] of Object.entries(INITIAL_CELL_COUNTS)) {
        const type = Number(typeStr);
        for (let i = 0; i < count; i++) {
            cells.push(createCell(type, id++, width, height));
        }
    }

    return cells;
};

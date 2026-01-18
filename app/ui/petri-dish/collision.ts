import type { Cell, CollisionContext, CollisionResult } from './types';
import {
    CELL_TYPE,
    getCellConfig,
    MIN_SPLIT_RADIUS,
    SPLIT_RADIUS_DIVISOR,
    SPLIT_OFFSET_MULTIPLIER,
    SPLIT_VELOCITY_OFFSET,
    MAX_CELLS,
    ABSORBER_MIN_RADIUS,
} from './constants';

// Collision action types
type CollisionAction = 'bounce' | 'absorb' | 'shrink' | 'shrink_both' | 'shrink_split' | 'split' | 'absorb_larger';

// Matrix defining collision actions: COLLISION_ACTIONS[typeA][typeB] = action for A
// Symmetric pairs handled by normalizing order (lower type first)
const COLLISION_ACTIONS: Record<number, Record<number, CollisionAction>> = {
    [CELL_TYPE.ABSORBER]: {
        [CELL_TYPE.ABSORBER]: 'bounce',
        [CELL_TYPE.FOOD]: 'absorb',
        [CELL_TYPE.POISON]: 'shrink',
        [CELL_TYPE.NEUTRAL]: 'bounce',
    },
    [CELL_TYPE.FOOD]: {
        [CELL_TYPE.FOOD]: 'absorb_larger',
        [CELL_TYPE.POISON]: 'shrink_split',
        [CELL_TYPE.NEUTRAL]: 'bounce',
    },
    [CELL_TYPE.POISON]: {
        [CELL_TYPE.ABSORBER]: 'shrink',
        [CELL_TYPE.POISON]: 'shrink_both',
        [CELL_TYPE.NEUTRAL]: 'bounce',
    },
    [CELL_TYPE.NEUTRAL]: {
        [CELL_TYPE.NEUTRAL]: 'bounce',
    },
};

// Empty result constant
const NO_COLLISION: CollisionResult = {
    handled: true,
    removeIds: [],
    updates: new Map(),
    newCells: [],
};

// Get collision action for two cell types
const getAction = (type1: number, type2: number): CollisionAction => {
    const low = Math.min(type1, type2);
    const high = Math.max(type1, type2);
    return COLLISION_ACTIONS[low]?.[high] ?? 'bounce';
};

// Attract: pull cells toward each other (for small same-type cells)
const doAttract = (ctx: CollisionContext): CollisionResult => {
    const { cell1, cell2, distance, dx, dy, currentTime } = ctx;

    const ndx = distance > 0 ? dx / distance : 1;
    const ndy = distance > 0 ? dy / distance : 0;

    // Attraction strength proportional to each cell's radius
    const baseStrength = 0.09;
    const attract1 = baseStrength * cell1.radius;
    const attract2 = baseStrength * cell2.radius;

    const updates = new Map<number, Partial<Cell>>();

    // Apply velocity toward each other, scaled by radius
    updates.set(cell1.id, {
        vx: cell1.vx - ndx * attract1,
        vy: cell1.vy - ndy * attract1,
        lastCollision: currentTime,
    });
    updates.set(cell2.id, {
        vx: cell2.vx + ndx * attract2,
        vy: cell2.vy + ndy * attract2,
        lastCollision: currentTime,
    });

    return { handled: true, removeIds: [], updates, newCells: [] };
};

// Check if both cells are same type and small enough to attract
const shouldAttract = (cell1: Cell, cell2: Cell): boolean => {
    return cell1.type === cell2.type &&
           cell1.radius <= MIN_SPLIT_RADIUS &&
           cell2.radius <= MIN_SPLIT_RADIUS;
};

// Bounce: elastic collision with separation
const doBounce = (ctx: CollisionContext): CollisionResult => {
    const { cell1, cell2, distance, dx, dy, currentTime } = ctx;

    const ndx = distance > 0 ? dx / distance : 1;
    const ndy = distance > 0 ? dy / distance : 0;

    const mass1 = cell1.radius * cell1.radius;
    const mass2 = cell2.radius * cell2.radius;
    const totalMass = mass1 + mass2;

    const overlap = (cell1.radius + cell2.radius) - distance;
    const sep1 = overlap > 0 ? (mass2 / totalMass) * overlap * 1.1 : 0;
    const sep2 = overlap > 0 ? (mass1 / totalMass) * overlap * 1.1 : 0;

    const updates = new Map<number, Partial<Cell>>();

    const dvx = cell1.vx - cell2.vx;
    const dvy = cell1.vy - cell2.vy;
    const dvn = dvx * ndx + dvy * ndy;

    if (dvn < 0) {
        // Cells approaching - apply impulse to bounce them apart
        const impulse = (2 * dvn) / totalMass;
        updates.set(cell1.id, {
            x: cell1.x + ndx * sep1,
            y: cell1.y + ndy * sep1,
            vx: cell1.vx - impulse * mass2 * ndx,
            vy: cell1.vy - impulse * mass2 * ndy,
            lastCollision: currentTime,
        });
        updates.set(cell2.id, {
            x: cell2.x - ndx * sep2,
            y: cell2.y - ndy * sep2,
            vx: cell2.vx + impulse * mass1 * ndx,
            vy: cell2.vy + impulse * mass1 * ndy,
            lastCollision: currentTime,
        });
    } else if (overlap > 0) {
        updates.set(cell1.id, {
            x: cell1.x + ndx * sep1,
            y: cell1.y + ndy * sep1,
            lastCollision: currentTime,
        });
        updates.set(cell2.id, {
            x: cell2.x - ndx * sep2,
            y: cell2.y - ndy * sep2,
            lastCollision: currentTime,
        });
    } else {
        return NO_COLLISION;
    }

    return { handled: true, removeIds: [], updates, newCells: [] };
};

// Absorb: first cell absorbs second cell
const doAbsorb = (absorber: Cell, absorbed: Cell, currentTime: number): CollisionResult => {
    const updates = new Map<number, Partial<Cell>>();
    updates.set(absorber.id, {
        radius: absorber.radius + absorbed.radius * 0.5,
        mass: absorber.mass + absorbed.radius,
        lastCollision: currentTime,
    });
    return { handled: true, removeIds: [absorbed.id], updates, newCells: [] };
};

// Absorb larger: larger cell absorbs smaller, equal sizes bounce
const doAbsorbLarger = (cell1: Cell, cell2: Cell, currentTime: number, ctx: CollisionContext): CollisionResult => {
    if (cell1.radius === cell2.radius) {
        return doBounce(ctx);
    }
    const larger = cell1.radius > cell2.radius ? cell1 : cell2;
    const smaller = cell1.radius > cell2.radius ? cell2 : cell1;
    return doAbsorb(larger, smaller, currentTime);
};

// Shrink: cell shrinks relative to other cell's size
const doShrink = (cell: Cell, other: Cell, currentTime: number, ctx: CollisionContext): CollisionResult => {
    const shrinkAmount = other.radius * 0.3;
    const newRadius = Math.max(cell.radius - shrinkAmount, ABSORBER_MIN_RADIUS);

    const updates = new Map<number, Partial<Cell>>();
    updates.set(cell.id, {
        radius: newRadius,
        mass: newRadius,
        lastCollision: currentTime,
    });

    const bounceResult = doBounce(ctx);
    for (const [id, update] of bounceResult.updates) {
        const existing = updates.get(id);
        updates.set(id, existing ? { ...existing, ...update } : update);
    }

    return { handled: true, removeIds: [], updates, newCells: [] };
};

// Shrink both: both cells shrink relative to each other and bounce
const doShrinkBoth = (ctx: CollisionContext): CollisionResult => {
    const { cell1, cell2, currentTime } = ctx;

    const shrink1 = cell2.radius * 0.3;
    const shrink2 = cell1.radius * 0.3;
    const newRadius1 = Math.max(cell1.radius - shrink1, ABSORBER_MIN_RADIUS);
    const newRadius2 = Math.max(cell2.radius - shrink2, ABSORBER_MIN_RADIUS);

    const updates = new Map<number, Partial<Cell>>();
    updates.set(cell1.id, {
        radius: newRadius1,
        mass: newRadius1,
    });
    updates.set(cell2.id, {
        radius: newRadius2,
        mass: newRadius2,
    });

    const bounceResult = doBounce(ctx);
    for (const [id, update] of bounceResult.updates) {
        const existing = updates.get(id);
        updates.set(id, existing ? { ...existing, ...update } : update);
    }

    return { handled: true, removeIds: [], updates, newCells: [] };
};

// Shrink and split: poison shrinks, food splits
const doShrinkSplit = (food: Cell, poison: Cell, ctx: CollisionContext): CollisionResult => {
    const { distance, dx, dy, currentTime } = ctx;

    // Shrink poison
    const shrinkAmount = food.radius * 0.3;
    const newPoisonRadius = Math.max(poison.radius - shrinkAmount, ABSORBER_MIN_RADIUS);

    const updates = new Map<number, Partial<Cell>>();
    updates.set(poison.id, {
        radius: newPoisonRadius,
        mass: newPoisonRadius,
        lastCollision: currentTime,
    });

    // If food can't split, just bounce
    if (food.radius < MIN_SPLIT_RADIUS || ctx.totalCells >= MAX_CELLS - 1) {
        const bounceResult = doBounce(ctx);
        for (const [id, update] of bounceResult.updates) {
            const existing = updates.get(id);
            updates.set(id, existing ? { ...existing, ...update } : update);
        }
        return { handled: true, removeIds: [], updates, newCells: [] };
    }

    // Split food
    const newRadius = food.radius / SPLIT_RADIUS_DIVISOR;
    const config = getCellConfig(food.type);
    const offset = newRadius * SPLIT_OFFSET_MULTIPLIER;

    updates.set(food.id, {
        radius: newRadius,
        mass: newRadius,
        x: food.x - offset,
        vx: food.vx - SPLIT_VELOCITY_OFFSET,
        lastCollision: currentTime,
    });

    // Bounce poison away
    const ndx = distance > 0 ? dx / distance : 1;
    const ndy = distance > 0 ? dy / distance : 0;
    const isCell1 = ctx.cell1.id === poison.id;
    const bounceDir = isCell1 ? 1 : -1;
    const separation = food.radius + poison.radius - distance;

    const poisonUpdate = updates.get(poison.id) ?? {};
    updates.set(poison.id, {
        ...poisonUpdate,
        x: poison.x + bounceDir * ndx * (separation > 0 ? separation : 0),
        y: poison.y + bounceDir * ndy * (separation > 0 ? separation : 0),
        vx: poison.vx + bounceDir * ndx * 0.5,
        vy: poison.vy + bounceDir * ndy * 0.5,
    });

    const newCell: Cell = {
        id: ctx.nextId,
        type: food.type,
        x: food.x + offset,
        y: food.y,
        radius: newRadius,
        color: config.color,
        vx: food.vx + SPLIT_VELOCITY_OFFSET,
        vy: food.vy,
        mass: newRadius,
        lastCollision: currentTime,
    };

    return { handled: true, removeIds: [], updates, newCells: [newCell] };
};

// Split: cell splits into two, other cell bounces away
const doSplit = (cell: Cell, other: Cell, ctx: CollisionContext): CollisionResult => {
    if (cell.radius < MIN_SPLIT_RADIUS || ctx.totalCells >= MAX_CELLS - 1) {
        return doBounce(ctx);
    }

    const { distance, dx, dy, currentTime } = ctx;
    const newRadius = cell.radius / SPLIT_RADIUS_DIVISOR;
    const config = getCellConfig(cell.type);
    const offset = newRadius * SPLIT_OFFSET_MULTIPLIER;

    const ndx = distance > 0 ? dx / distance : 1;
    const ndy = distance > 0 ? dy / distance : 0;
    const isCell1 = ctx.cell1.id === cell.id;
    const bounceDir = isCell1 ? -1 : 1;

    const updates = new Map<number, Partial<Cell>>();
    updates.set(cell.id, {
        radius: newRadius,
        mass: newRadius,
        x: cell.x - offset,
        vx: cell.vx - SPLIT_VELOCITY_OFFSET,
        lastCollision: currentTime,
    });

    const separation = cell.radius + other.radius - distance;
    updates.set(other.id, {
        x: other.x + bounceDir * ndx * (separation > 0 ? separation : 0),
        y: other.y + bounceDir * ndy * (separation > 0 ? separation : 0),
        vx: other.vx + bounceDir * ndx * 0.5,
        vy: other.vy + bounceDir * ndy * 0.5,
        lastCollision: currentTime,
    });

    const newCell: Cell = {
        id: ctx.nextId,
        type: cell.type,
        x: cell.x + offset,
        y: cell.y,
        radius: newRadius,
        color: config.color,
        vx: cell.vx + SPLIT_VELOCITY_OFFSET,
        vy: cell.vy,
        mass: newRadius,
        lastCollision: currentTime,
    };

    return { handled: true, removeIds: [], updates, newCells: [newCell] };
};

// Main collision resolver
export const resolveCollision = (ctx: CollisionContext): CollisionResult => {
    const { cell1, cell2, currentTime } = ctx;

    // Small same-type cells attract each other
    if (shouldAttract(cell1, cell2)) {
        return doAttract(ctx);
    }

    const action = getAction(cell1.type, cell2.type);

    switch (action) {
        case 'bounce':
            return doBounce(ctx);

        case 'absorb': {
            // Absorber (type 0) always absorbs the other cell
            const absorber = cell1.type === CELL_TYPE.ABSORBER ? cell1 : cell2;
            const absorbed = cell1.type === CELL_TYPE.ABSORBER ? cell2 : cell1;
            return doAbsorb(absorber, absorbed, currentTime);
        }

        case 'shrink': {
            // Absorber shrinks when hitting poison
            const absorber = cell1.type === CELL_TYPE.ABSORBER ? cell1 : cell2;
            const poison = cell1.type === CELL_TYPE.ABSORBER ? cell2 : cell1;
            return doShrink(absorber, poison, currentTime, ctx);
        }

        case 'shrink_both': {
            // Equal size: both shrink and bounce; different sizes: larger absorbs smaller
            if (cell1.radius === cell2.radius) {
                return doShrinkBoth(ctx);
            }
            const larger = cell1.radius > cell2.radius ? cell1 : cell2;
            const smaller = cell1.radius > cell2.radius ? cell2 : cell1;
            return doAbsorb(larger, smaller, currentTime);
        }

        case 'shrink_split': {
            // Poison shrinks, food splits
            const food = cell1.type === CELL_TYPE.FOOD ? cell1 : cell2;
            const poison = cell1.type === CELL_TYPE.FOOD ? cell2 : cell1;
            return doShrinkSplit(food, poison, ctx);
        }

        case 'split': {
            // Food splits when hitting poison
            const food = cell1.type === CELL_TYPE.FOOD ? cell1 : cell2;
            const poison = cell1.type === CELL_TYPE.FOOD ? cell2 : cell1;
            return doSplit(food, poison, ctx);
        }

        case 'absorb_larger':
            return doAbsorbLarger(cell1, cell2, currentTime, ctx);

        default:
            return doBounce(ctx);
    }
};

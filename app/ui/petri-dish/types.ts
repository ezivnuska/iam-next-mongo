// Cell interface
export interface Cell {
    id: number;
    x: number;
    y: number;
    radius: number;
    vx: number;
    vy: number;
    type: number;           // 0 = absorber, > 0 = prey subtype
    color: string;
    mass: number;           // accumulated mass
    lastCollision: number;
}

// Collision result returned by handlers
export interface CollisionResult {
    handled: boolean;
    removeIds: number[];
    updates: Map<number, Partial<Cell>>;
    newCells: Cell[];
}

// Collision context passed to handlers
export interface CollisionContext {
    cell1: Cell;
    cell2: Cell;
    distance: number;
    dx: number;
    dy: number;
    currentTime: number;
    nextId: number;
    totalCells: number;
}

// Type alias for collision handler functions
export type CollisionHandler = (ctx: CollisionContext) => CollisionResult | null;

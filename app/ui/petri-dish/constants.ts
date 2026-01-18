// Cell Type Constants
export const CELL_TYPE = {
    ABSORBER: 0,
    FOOD: 1,
    POISON: 2,
    NEUTRAL: 3,
} as const;

// Physics constants
export const COLLISION_COOLDOWN = 250;
export const ABSORBER_SHRINK_RATE = 0.01;
export const ABSORBER_MIN_RADIUS = 2;

// Split constants
export const MIN_SPLIT_RADIUS = 5;
export const MAX_ABSORB_RADIUS = 100;
export const SPLIT_CELL_COUNT = 2;
export const SPLIT_RADIUS_DIVISOR = 2;
export const SPLIT_OFFSET_MULTIPLIER = 1.5;
export const SPLIT_VELOCITY_OFFSET = 0.5;
export const MAX_CELLS = 200;

// Cell configuration interface
export interface CellTypeConfig {
    color: string;
    radius: number;
    velocity: { min: number; max: number };
    stroke: { color: string; width: number; dash: number[] };
}

// Default config for undefined prey types
export const DEFAULT_CELL_CONFIG: CellTypeConfig = {
    color: '#4ade80',
    radius: 10,
    velocity: { min: 0.5, max: 1.0 },
    stroke: { color: 'rgba(74, 222, 128, 0.8)', width: 2, dash: [] },
};

// Unified cell configuration by type number
export const CELL_CONFIG: Record<number, CellTypeConfig> = {
    0: {
        color: '#ffffff',
        radius: 30,
        velocity: { min: 0.2, max: 0.6 },
        stroke: { color: 'rgba(239, 68, 68, 0.8)', width: 3, dash: [] },
    },
    1: {
        color: '#86efac',
        radius: 10,
        velocity: { min: 0.2, max: 0.6 },
        stroke: { color: 'rgba(134, 239, 172, 0.8)', width: 2, dash: [] },
    },
    2: {
        color: '#ff0000',
        radius: 10,
        velocity: { min: 0.4, max: 0.8 },
        stroke: { color: 'rgba(255, 255, 255, 1.0)', width: 2, dash: [] },
    },
    3: {
        color: '#0000ff',
        radius: 10,
        velocity: { min: 0.6, max: 1.0 },
        stroke: { color: 'rgba(34, 197, 94, 0.8)', width: 2, dash: [] },
    },
};

// Initial cell counts by type
export const INITIAL_CELL_COUNTS: Record<number, number> = {
    0: 1, // ABSORBER
    1: 30, // FOOD type 1
    2: 20, // POISON type 2
    3: 10, // NEUTRAL type 3
};

// Helper to get config for a type (with fallback to default)
export const getCellConfig = (type: number): CellTypeConfig =>
    CELL_CONFIG[type] ?? DEFAULT_CELL_CONFIG;

// Number of prey variants defined (types 1, 2, 3)
export const PREY_VARIANT_COUNT = 3;

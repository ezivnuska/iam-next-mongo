export function MemoriesIcon({ className }: { className?: string }) {
    return (
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' className={className}>
            {/* polaroid body */}
            <rect x='4' y='3' width='16' height='18' rx='1.5' fill='currentColor' stroke='none' opacity='0.15' />
            <rect x='4' y='3' width='16' height='18' rx='1.5' />
            {/* photo area */}
            <rect x='6.5' y='5.5' width='11' height='10' rx='0.5' fill='currentColor' stroke='none' />
        </svg>
    );
}

export function PostsIcon({ className }: { className?: string }) {
    return (
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' className={className}>
            {/* page body */}
            <path d='M 5 2 L 15 2 L 19 6 L 19 22 L 5 22 Z' fill='currentColor' opacity='0.1' />
            <path d='M 5 2 L 15 2 L 19 6 L 19 22 L 5 22 Z' />
            {/* folded corner */}
            <path d='M 15 2 L 15 6 L 19 6' />
            {/* text lines */}
            <line x1='8' y1='10' x2='16' y2='10' />
            <line x1='8' y1='14' x2='16' y2='14' />
            <line x1='8' y1='18' x2='13' y2='18' />
        </svg>
    );
}

export function ImagesIcon({ className }: { className?: string }) {
    return (
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' className={className}>
            {/* frame */}
            <rect x='3' y='5' width='18' height='14' rx='2' />
            {/* sun/circle */}
            <circle cx='8.5' cy='10' r='1.5' />
            {/* mountain/landscape */}
            <polyline points='3,19 8,13 12,16 15,12 21,19' />
        </svg>
    );
}

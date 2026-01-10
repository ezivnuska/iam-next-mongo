// app/ui/icons/t3-icon.tsx

export default function T3Icon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox='0 0 24 24'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
        >
            {/* X symbol */}
            <line
                x1='4'
                y1='4'
                x2='20'
                y2='20'
                stroke='currentColor'
                strokeWidth='2.5'
                strokeLinecap='round'
            />
            <line
                x1='20'
                y1='4'
                x2='4'
                y2='20'
                stroke='currentColor'
                strokeWidth='2.5'
                strokeLinecap='round'
            />

            {/* O symbol (50% smaller, centered) */}
            <circle
                cx='12'
                cy='12'
                r='8'
                stroke='currentColor'
                strokeWidth='2'
                fill='none'
            />
        </svg>
    );
}

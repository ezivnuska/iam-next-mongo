// app/ui/icons/poker-chip-icon.tsx

export default function PokerChipIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox='0 0 24 24'
            fill='currentColor'
            xmlns='http://www.w3.org/2000/svg'
        >
            <circle cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='2' fill='none' />
            <circle cx='12' cy='12' r='6' fill='currentColor' />
            <circle cx='12' cy='4' r='1.5' fill='currentColor' />
            <circle cx='12' cy='20' r='1.5' fill='currentColor' />
            <circle cx='4' cy='12' r='1.5' fill='currentColor' />
            <circle cx='20' cy='12' r='1.5' fill='currentColor' />
        </svg>
    );
}

// app/ui/chart.tsx

'use client';

import clsx from "clsx";

interface ChartProps {
    cols: number[];
    direction?: 'col' | 'row';
    justification?: 'center' | 'default';
    className?: string;
}

export default function Chart({ cols, direction = 'col', justification = 'default', className = '' }: ChartProps) {
    if (!cols?.length) return null
    return (
        <div
            className={clsx(
                'flex flex-1 justify-center h-full w-full border-2 border-gray-400 dark:border-gray-400',
                direction === 'col' ? 'flex-row px-2' : 'flex-col py-2',
                justification === 'center' ? 'items-center' : direction === 'col' ? 'items-end' : '',
                className
            )}
        >
            {cols.map((col: number, i: number) => {
                const size = `${Math.floor((col / 10) * 100) + 5}%`
                const style = direction === 'col' ? { height: size } : { width: size }
                return (
                    <div
                        key={`col-${i}`}
                        className='flex flex-1 bg-green-300 border border-green-500 transition-all duration-500 ease-in-out'
                        style={style}
                    />
                )
            })}
        </div>
    );
}

export interface LineItem {
  id: string;
  text: string;
  fading: boolean;
  enterDelay: number;
}

interface TimelineLoaderProps {
  lines: LineItem[];
}

export function TimelineLoader({ lines }: TimelineLoaderProps) {
  return (
    <div className='px-1 py-2'>
      {lines.map((line) => (
        <div
          key={line.id}
          style={{
            maxHeight: line.fading ? '0' : '2rem',
            marginBottom: line.fading ? '0' : '0.375rem',
            transition: 'max-height 1s ease-out, margin-bottom 1s ease-out',
          }}
        >
          <p
            className={`text-sm font-mono ${line.text.startsWith('Failed') ? 'text-red-500' : 'text-gray-500'}`}
            style={{
              animation: line.fading
                ? 'slide-up-fade-out 1s ease-out forwards'
                : `fade-in 1s ease-out ${line.enterDelay}ms both`,
            }}
          >
            {line.text}
          </p>
        </div>
      ))}
      <span className='inline-block mt-1 w-1.5 h-4 bg-gray-300 animate-pulse rounded-sm' />
    </div>
  );
}

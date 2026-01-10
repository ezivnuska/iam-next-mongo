// app/ui/memories/memory-polaroid-grid.tsx

'use client';

import type { Memory } from '@/app/lib/definitions/memory';
import type { Image as ImageType } from '@/app/lib/definitions/image';
import MemoryPolaroid from '@/app/ui/memories/memory-polaroid';

interface MemoryPolaroidGridProps {
  memories: Memory[];
  onImageClick?: (image: ImageType) => void;
}

export default function MemoryPolaroidGrid({ memories, onImageClick }: MemoryPolaroidGridProps) {
  if (memories.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        No memories to display
      </div>
    );
  }

  // Alternate rotation angles for a more natural polaroid scatter effect
  const rotations = [-2, 1, -1, 2, -3, 1.5, -1.5, 2.5];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 p-8">
      {memories.map((memory, index) => (
        <div
          key={memory.id}
          className="flex justify-center"
          style={{
            transform: `rotate(${rotations[index % rotations.length]}deg)`,
          }}
        >
          <MemoryPolaroid
            memory={memory}
            onImageClick={memory.image && onImageClick ? () => onImageClick(memory.image!) : undefined}
            className="hover:scale-105 transition-transform duration-200"
          />
        </div>
      ))}
    </div>
  );
}

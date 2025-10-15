// app/ui/public-content-feed.tsx

"use client";

import { useState } from "react";
import type { PublicContentItem } from "@/app/lib/actions/public-content";
import ContentItemCard from "@/app/ui/content-item-card";
import { Button } from "@/app/ui/button";

interface PublicContentFeedProps {
  initialContent: PublicContentItem[];
}

type FilterType = 'all' | 'memory' | 'post' | 'image';

export default function PublicContentFeed({ initialContent }: PublicContentFeedProps) {
  const [content] = useState<PublicContentItem[]>(initialContent);
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredContent = filter === 'all'
    ? content
    : content.filter(item => item.contentType === filter);

  return (
    <div className="mt-4">
      {/* Filter Tabs */}
      <div className="flex justify-between gap-2 mb-4">
        <Button
          variant={filter === 'all' ? 'active' : 'ghost'}
          onClick={() => setFilter('all')}
        >
          All
          {/* ({content.length}) */}
        </Button>
        <Button
          variant={filter === 'memory' ? 'active' : 'ghost'}
          onClick={() => setFilter('memory')}
        >
          Memories
          {/* ({content.filter(i => i.contentType === 'memory').length}) */}
        </Button>
        <Button
          variant={filter === 'post' ? 'active' : 'ghost'}
          onClick={() => setFilter('post')}
        >
          Posts
          {/* ({content.filter(i => i.contentType === 'post').length}) */}
        </Button>
        <Button
          variant={filter === 'image' ? 'active' : 'ghost'}
          onClick={() => setFilter('image')}
        >
          Images
          {/* ({content.filter(i => i.contentType === 'image').length}) */}
        </Button>
      </div>

      {/* Content List */}
      <div className="space-y-4">
        {filteredContent.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No content to display</p>
        ) : (
          filteredContent.map((item) => (
            <ContentItemCard key={`${item.contentType}-${item.id}`} item={item} />
          ))
        )}
      </div>
    </div>
  );
}

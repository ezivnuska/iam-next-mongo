// app/ui/public-content-feed.tsx

"use client";

import { useState } from "react";
import type { ContentItem } from "@/app/lib/definitions/content";
import ContentItemCard from "@/app/ui/content-item-card";
import ContentFilterTabs from "@/app/ui/content-filter-tabs";

interface PublicContentFeedProps {
  initialContent: ContentItem[];
}

export default function PublicContentFeed({ initialContent }: PublicContentFeedProps) {
  const [content] = useState<ContentItem[]>(initialContent);
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set());

  // If no filters are selected, show all content
  // Otherwise, show only content that matches the selected filters
  const filteredContent = selectedFilters.size === 0
    ? content
    : content.filter(item => selectedFilters.has(item.contentType));

  return (
    <div className="mt-4">
      <ContentFilterTabs
        selectedFilters={selectedFilters}
        onFilterChange={setSelectedFilters}
      />

      <div className="space-y-4 mt-4">
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

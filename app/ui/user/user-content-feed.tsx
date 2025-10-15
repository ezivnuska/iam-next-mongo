// app/ui/user/user-content-feed.tsx

"use client";

import { useState } from "react";
import { formatRelativeTime } from "@/app/lib/utils/format-date";
import UserAvatar from "@/app/ui/user/user-avatar";
import Image from "next/image";
import type { ContentItem } from "@/app/lib/actions/user-content";
import { Button } from "@/app/ui/button";

interface UserContentFeedProps {
  initialContent: ContentItem[];
}

type FilterType = 'all' | 'memory' | 'post' | 'image';

export default function UserContentFeed({ initialContent }: UserContentFeedProps) {
  const [content] = useState<ContentItem[]>(initialContent);
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredContent = filter === 'all'
    ? content
    : content.filter(item => item.contentType === filter);

  return (
    <div className="mt-6">
      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        <Button
          variant="ghost"
          className={`px-4 py-2 font-medium transition-colors ${
            filter === 'all'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          onClick={() => setFilter('all')}
        >
          All ({content.length})
        </Button>
        <Button
          variant="ghost"
          className={`px-4 py-2 font-medium transition-colors ${
            filter === 'memory'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          onClick={() => setFilter('memory')}
        >
          Memories ({content.filter(i => i.contentType === 'memory').length})
        </Button>
        <Button
          variant="ghost"
          className={`px-4 py-2 font-medium transition-colors ${
            filter === 'post'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          onClick={() => setFilter('post')}
        >
          Posts ({content.filter(i => i.contentType === 'post').length})
        </Button>
        <Button
          variant="ghost"
          className={`px-4 py-2 font-medium transition-colors ${
            filter === 'image'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          onClick={() => setFilter('image')}
        >
          Images ({content.filter(i => i.contentType === 'image').length})
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

function ContentItemCard({ item }: { item: ContentItem }) {
  if (item.contentType === 'memory') {
    const memory = item;
    const medium = memory.image?.variants.find((v) => v.size === "medium");
    const memoryDate = new Date(memory.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return (
      <div className="mb-4 py-3 px-2 border rounded-lg bg-white shadow-sm">
        <div className="flex items-start gap-3">
          <UserAvatar
            username={memory.author.username}
            avatar={memory.author.avatar}
            size={40}
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-row items-center justify-between mb-2">
              <div className="flex flex-col">
                <p className="font-semibold">{memory.author.username}</p>
                <span className="text-xs text-gray-500">{formatRelativeTime(memory.createdAt)}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-col mb-1 gap-2">
                <div>
                  <p className="text-lg font-medium text-gray-700">{memory.title || "Untitled"}</p>
                  <p className="text-sm text-gray-500">{memoryDate}</p>
                  {/* {memory.shared && (
                    <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded mt-1">
                      Shared
                    </span>
                  )} */}
                </div>
              </div>
              {memory.image && (
                <img
                  src={medium?.url}
                  alt="Memory image"
                  className="max-w-full max-h-96 rounded mb-2 object-cover"
                />
              )}
              <p className="whitespace-pre-wrap">{memory.content}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (item.contentType === 'post') {
    const post = item;
    const medium = post.image?.variants.find((v) => v.size === "medium");

    return (
      <div className="mb-2 p-2 border rounded bg-white shadow-sm">
        <div className="flex items-start gap-3">
          <UserAvatar
            username={post.author.username}
            avatar={post.author.avatar}
            size={40}
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-col mb-2">
              <p className="font-semibold">{post.author.username}</p>
              <span className="text-xs text-gray-500">{formatRelativeTime(post.createdAt)}</span>
            </div>
            {post.image && (
              <img
                src={medium?.url}
                alt="Post image"
                className="max-w-full max-h-96 rounded mb-2 object-cover"
              />
            )}
            <p>{post.content}</p>
            {post.linkUrl && (
              <a href={post.linkUrl} target="_blank" className="text-blue-500 underline mt-2 block">
                [source]
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (item.contentType === 'image') {
    const image = item;
    const medium = image.variants.find((v) => v.size === "medium");
    
    return (
      <div className="mb-2 p-2 border rounded bg-white shadow-sm">
        <div className="flex items-start gap-3">
          <UserAvatar
            username={image.username}
            size={40}
          />
          <div className="flex-1 flex-col min-w-0">
            <div className="flex flex-col mb-2">
              <p className="font-semibold">{image.username}</p>
              <span className="text-xs text-gray-500">{formatRelativeTime(image.createdAt)}</span>
            </div>
            {medium?.url && (
                <div className="relative w-full h-64 border-1 mb-2">
                    <Image
                        src={medium.url}
                        alt={image.alt || "Image"}
                        fill
                        style={{ objectFit: "cover" }}
                        className="rounded"
                    />
                </div>
            )}
            <div className="flex gap-4 text-sm text-gray-600">
                <span>❤️ {image.likes?.length || 0}</span>
                <span>💬 {image.commentCount || 0}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

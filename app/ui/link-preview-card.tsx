// app/ui/link-preview-card.tsx

interface LinkPreview {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

interface LinkPreviewCardProps {
  linkUrl: string;
  linkPreview: LinkPreview;
  compact?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export default function LinkPreviewCard({ linkUrl, linkPreview, compact = false, onClick }: LinkPreviewCardProps) {
  const { title, description, image, siteName } = linkPreview;
  const domain = (() => {
    try { return new URL(linkUrl).hostname.replace(/^www\./, ''); } catch { return linkUrl; }
  })();

  return (
    <a
      href={linkUrl}
      target='_blank'
      rel='noopener noreferrer'
      onClick={onClick}
      className='block border border-gray-200 rounded-lg overflow-hidden hover:border-gray-400 transition-colors mt-2 no-underline'
    >
      {!compact && image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={title || 'Link preview'} className='w-full h-40 object-cover' />
      )}
      <div className={`px-3 py-2 ${compact ? 'flex items-center gap-3' : ''}`}>
        {compact && image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt='' className='w-12 h-12 object-cover rounded flex-shrink-0' />
        )}
        <div className='min-w-0'>
          <p className='text-xs text-gray-500 truncate'>{siteName || domain}</p>
          {title && <p className={`font-medium text-gray-900 ${compact ? 'text-sm truncate' : 'text-sm'}`}>{title}</p>}
          {!compact && description && (
            <p className='text-xs text-gray-600 mt-0.5 line-clamp-2'>{description}</p>
          )}
        </div>
      </div>
    </a>
  );
}

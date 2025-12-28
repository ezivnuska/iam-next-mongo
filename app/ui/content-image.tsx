// app/ui/content-image.tsx

import { getBestVariant, IMAGE_SIZES } from '@/app/lib/utils/images';
import type { Image as ImageType } from '@/app/lib/definitions/image';

interface ContentImageProps {
  image?: ImageType | null;
  alt?: string;
  className?: string;
  onClick?: () => void;
}

export default function ContentImage({ image, alt = 'Image', className = 'rounded my-2 object-cover', onClick }: ContentImageProps) {
  const imageVariant = getBestVariant(image, IMAGE_SIZES.CONTENT);

  if (!imageVariant) return null;

  return (
    <img
      src={imageVariant.url}
      alt={alt}
      className={`${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    />
  );
}

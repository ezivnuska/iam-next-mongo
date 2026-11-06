'use client'

import Image from 'next/image'

interface LightboxProps {
  src: string
  alt: string
  onClose: () => void
  positionText?: string
  touchHandlers?: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: () => void
  }
  children?: React.ReactNode
}

export default function Lightbox({ src, alt, onClose, positionText, touchHandlers, children }: LightboxProps) {
  return (
    <div
      className='fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50'
      onClick={onClose}
      {...touchHandlers}
    >
      <div className='relative max-w-5xl w-full h-full flex items-center justify-center p-4'>
        <Image
          src={src}
          alt={alt}
          fill
          style={{ objectFit: 'contain' }}
          sizes='100vw'
          onClick={e => e.stopPropagation()}
        />
        <button
          className='absolute top-4 right-4 bg-white rounded-full px-3 py-1 shadow text-black z-10'
          onClick={onClose}
        >
          ✕
        </button>
        {positionText && (
          <div className='absolute top-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-60 text-white rounded-full px-4 py-2 text-sm z-10'>
            {positionText}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

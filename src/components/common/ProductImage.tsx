import React, { useState, useEffect, useRef } from 'react';
import { Images } from '../../data/images';

// Global memory cache of loaded image URLs to ensure instantaneous display on category switches & re-renders
export const loadedImagesCache = new Set<string>();

export const preloadImage = (url: string) => {
  if (!url || typeof url !== 'string' || url.trim() === '' || loadedImagesCache.has(url)) return;
  const img = new Image();
  img.referrerPolicy = 'no-referrer';
  img.onload = () => loadedImagesCache.add(url);
  img.src = url;
};

export const preloadImages = (urls: string[]) => {
  urls.forEach((url) => preloadImage(url));
};

interface ProductImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
  alt: string;
  fallbackSrc?: string;
  className?: string;
  priority?: boolean;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  fallbackSrc = '/default-food.webp',
  className = '',
  priority = false,
  loading,
  ...props
}) => {
  const safeFallback = (fallbackSrc && fallbackSrc.trim() !== '') ? fallbackSrc : (Images.defaultFood || '/default-food.webp');
  const safeSrc = (src && typeof src === 'string' && src.trim() !== '') ? src : safeFallback;
  const [imgSrc, setImgSrc] = useState<string>(safeSrc);
  const imgRef = useRef<HTMLImageElement>(null);

  const isAlreadyLoaded = loadedImagesCache.has(safeSrc);
  const [isLoaded, setIsLoaded] = useState<boolean>(isAlreadyLoaded);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    const validSrc = (src && typeof src === 'string' && src.trim() !== '') ? src : safeFallback;
    setImgSrc(validSrc);
    const cached = loadedImagesCache.has(validSrc);
    setIsLoaded(cached);
    setHasError(false);

    // If browser already completed loading image from cache
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      loadedImagesCache.add(validSrc);
      setIsLoaded(true);
    }
  }, [src, safeFallback]);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      const primaryFallback = safeFallback;
      if (imgSrc !== primaryFallback) {
        setImgSrc(primaryFallback);
      } else {
        setImgSrc('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80');
      }
    }
  };

  const handleLoad = () => {
    if (imgSrc && imgSrc.trim() !== '') {
      loadedImagesCache.add(imgSrc);
    }
    setIsLoaded(true);
  };

  const displaySrc = (imgSrc && imgSrc.trim() !== '') ? imgSrc : safeFallback;

  return (
    <div className={`relative overflow-hidden bg-[#1D140D] ${className}`}>
      {/* Background Skeleton/Placeholder while loading */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-[#1D140D] via-[#2A1D13] to-[#1D140D] animate-pulse" />
      )}

      {displaySrc ? (
        <img
          ref={imgRef}
          {...props}
          src={displaySrc}
          alt={alt}
          loading={priority ? 'eager' : (loading || 'lazy')}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-cover ${
            isAlreadyLoaded ? 'opacity-100 transition-none' : `transition-opacity duration-200 ease-out ${isLoaded ? 'opacity-100' : 'opacity-0'}`
          }`}
        />
      ) : null}
    </div>
  );
};


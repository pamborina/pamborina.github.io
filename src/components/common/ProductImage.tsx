import React, { useState, useEffect, useRef } from 'react';
import { Images } from '../../data/images';

// Global memory cache of loaded image URLs to ensure instantaneous display on category switches & re-renders
export const loadedImagesCache = new Set<string>();

export const preloadImage = (url: string) => {
  if (!url || loadedImagesCache.has(url)) return;
  const img = new Image();
  img.referrerPolicy = 'no-referrer';
  img.onload = () => loadedImagesCache.add(url);
  img.src = url;
};

export const preloadImages = (urls: string[]) => {
  urls.forEach((url) => preloadImage(url));
};

interface ProductImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
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
  const currentSrc = src || fallbackSrc;
  const [imgSrc, setImgSrc] = useState<string>(currentSrc);
  const imgRef = useRef<HTMLImageElement>(null);

  const isAlreadyLoaded = loadedImagesCache.has(currentSrc);
  const [isLoaded, setIsLoaded] = useState<boolean>(isAlreadyLoaded);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    setImgSrc(currentSrc);
    const cached = loadedImagesCache.has(currentSrc);
    setIsLoaded(cached);
    setHasError(false);

    // If browser already completed loading image from cache
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      loadedImagesCache.add(currentSrc);
      setIsLoaded(true);
    }
  }, [currentSrc]);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      const primaryFallback = fallbackSrc && fallbackSrc !== '/default-food.webp' ? fallbackSrc : Images.defaultFood;
      if (imgSrc !== primaryFallback) {
        setImgSrc(primaryFallback);
      } else {
        setImgSrc('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80');
      }
    }
  };

  const handleLoad = () => {
    if (imgSrc) {
      loadedImagesCache.add(imgSrc);
    }
    setIsLoaded(true);
  };

  return (
    <div className={`relative overflow-hidden bg-[#1D140D] ${className}`}>
      {/* Background Skeleton/Placeholder while loading */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-[#1D140D] via-[#2A1D13] to-[#1D140D] animate-pulse" />
      )}

      <img
        ref={imgRef}
        {...props}
        src={imgSrc}
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
    </div>
  );
};


import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Sparkles, Eye, Move, Smartphone, Lock, Unlock } from 'lucide-react';

interface ImageMagnifierProps {
  src: string;
  alt?: string;
  className?: string;
  containerClassName?: string;
  defaultZoomLevel?: number;
  lensSize?: number; // Lens diameter in px
  showControls?: boolean;
  onOpenFullscreen?: () => void;
}

export const ImageMagnifier: React.FC<ImageMagnifierProps> = ({
  src,
  alt = 'صورة المنيو المكبرة',
  className = '',
  containerClassName = '',
  defaultZoomLevel = 2.5,
  lensSize = 220,
  showControls = true,
  onOpenFullscreen,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [isHovered, setIsHovered] = useState(false);
  const [lensPosition, setLensPosition] = useState({ x: 0, y: 0 });
  const [bgStyle, setBgStyle] = useState({
    backgroundPosition: '0px 0px',
    backgroundSize: '100% 100%',
  });

  const [zoomLevel, setZoomLevel] = useState(defaultZoomLevel);
  const [mode, setMode] = useState<'lens' | 'pan'>('lens');
  const [isLensLocked, setIsLensLocked] = useState(false);
  const [touchActive, setTouchActive] = useState(false);

  // Pan mode state
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Calculate precise optical alignment relative to image bounds
  const updatePosition = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current || !imgRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const imgRect = imgRef.current.getBoundingClientRect();

      // 1. Lens coordinates relative to outer container
      let lx = clientX - containerRect.left;
      let ly = clientY - containerRect.top;
      lx = Math.max(0, Math.min(lx, containerRect.width));
      ly = Math.max(0, Math.min(ly, containerRect.height));

      // 2. Cursor relative to the actual rendered image boundaries
      const ix = clientX - imgRect.left;
      const iy = clientY - imgRect.top;

      // Ratio inside rendered image box (0.0 to 1.0)
      const ratioX = Math.max(0, Math.min(1, ix / (imgRect.width || 1)));
      const ratioY = Math.max(0, Math.min(1, iy / (imgRect.height || 1)));

      // 3. Zoomed dimensions
      const zoomedW = imgRect.width * zoomLevel;
      const zoomedH = imgRect.height * zoomLevel;

      // 4. Optical center calculation for background-position in px
      // (lensSize / 2) places the point under the cursor directly at the lens center
      const bgX = lensSize / 2 - ratioX * zoomedW;
      const bgY = lensSize / 2 - ratioY * zoomedH;

      setLensPosition({ x: lx, y: ly });
      setBgStyle({
        backgroundPosition: `${bgX}px ${bgY}px`,
        backgroundSize: `${zoomedW}px ${zoomedH}px`,
      });
    },
    [zoomLevel, lensSize]
  );

  // Mouse wheel zoom support
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.35 : -0.35;
      setZoomLevel((prev) => Math.min(Math.max(Number((prev + delta).toFixed(2)), 1.25), 6.0));
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Mouse Handlers
  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    if (!isLensLocked && !touchActive) setIsHovered(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isLensLocked) return;
    updatePosition(e.clientX, e.clientY);
  };

  // Touch Handlers for mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      setTouchActive(true);
      setIsHovered(true);
      updatePosition(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      updatePosition(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => {
    setTouchActive(false);
  };

  // Pan Drag Handlers
  const handlePanMouseDown = (e: React.MouseEvent) => {
    if (mode !== 'pan') return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };

  const handlePanMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || mode !== 'pan') return;
    setPanOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handlePanMouseUp = () => setIsDragging(false);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.75, 6.0));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.75, 1.25));

  const handleReset = () => {
    setZoomLevel(defaultZoomLevel);
    setMode('lens');
    setIsLensLocked(false);
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <div className={`flex flex-col items-center w-full select-none ${containerClassName}`}>
      {/* Control Bar */}
      {showControls && (
        <div className="w-full mb-3 p-2.5 rounded-2xl bg-[#170E08]/90 backdrop-blur-md border border-[#D4AF37]/30 flex flex-wrap items-center justify-between gap-2 shadow-xl z-20">
          {/* Zoom Level Presets */}
          <div className="flex items-center gap-1 bg-[#0D0704] p-1 rounded-xl border border-[#3D2C1E]">
            <span className="text-[11px] font-bold text-[#D4AF37] px-2 flex items-center gap-1">
              <ZoomIn className="w-3.5 h-3.5" />
              <span>التكبير:</span>
            </span>
            {[1.5, 2.5, 3.5, 5.0].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setZoomLevel(level)}
                className={`px-2 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                  zoomLevel === level
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#F4E08B] text-black shadow-md'
                    : 'text-[#C8BFB0] hover:text-[#FFF1C5] hover:bg-[#22160E]'
                }`}
              >
                {level}x
              </button>
            ))}
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1.5 bg-[#0D0704] p-1 rounded-xl border border-[#3D2C1E]">
            <button
              type="button"
              onClick={() => setMode('lens')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                mode === 'lens'
                  ? 'bg-[#2E1F14] text-[#F4E08B] border border-[#D4AF37]/50 shadow-sm'
                  : 'text-[#C8BFB0] hover:text-[#FFF1C5]'
              }`}
              title="عدسة مكبرة دائرية فائقة الدقة"
            >
              <Eye className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>عدسة دقيقة</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('pan')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                mode === 'pan'
                  ? 'bg-[#2E1F14] text-[#F4E08B] border border-[#D4AF37]/50 shadow-sm'
                  : 'text-[#C8BFB0] hover:text-[#FFF1C5]'
              }`}
              title="تكبير وسحب الصورة بالكامل لكل الزوايا"
            >
              <Move className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>سحب وتحريك كامل</span>
            </button>
          </div>

          {/* Zoom Buttons & Actions */}
          <div className="flex items-center gap-1.5 mr-auto">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 1.25}
              className="w-8 h-8 rounded-lg bg-[#22160E] border border-[#3D2C1E] text-[#FFF1C5] flex items-center justify-center hover:border-[#D4AF37] hover:text-[#D4AF37] disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
              title="تصغير"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 6.0}
              className="w-8 h-8 rounded-lg bg-[#22160E] border border-[#3D2C1E] text-[#FFF1C5] flex items-center justify-center hover:border-[#D4AF37] hover:text-[#D4AF37] disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
              title="تكبير"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="w-8 h-8 rounded-lg bg-[#22160E] border border-[#3D2C1E] text-[#C8BFB0] flex items-center justify-center hover:border-[#D4AF37] hover:text-[#FFF1C5] transition-all cursor-pointer"
              title="إعادة ضبط التكبير"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {onOpenFullscreen && (
              <button
                type="button"
                onClick={onOpenFullscreen}
                className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#D4AF37]/20 to-[#F4E08B]/20 border border-[#D4AF37] text-[#F4E08B] text-xs font-bold flex items-center gap-1 hover:brightness-125 transition-all cursor-pointer"
                title="فتح العرض الشامل ملء الشاشة"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">شاشة كاملة</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Image Viewport Container */}
      <div
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => mode === 'lens' && setIsLensLocked(!isLensLocked)}
        onMouseDown={handlePanMouseDown}
        onMouseMoveCapture={handlePanMouseMove}
        onMouseUp={handlePanMouseUp}
        className={`relative w-full overflow-hidden rounded-2xl border border-[#D4AF37]/40 bg-[#0A0604] flex items-center justify-center cursor-crosshair group shadow-2xl transition-all min-h-[300px] ${className}`}
        style={{ touchAction: 'none' }}
      >
        {/* Base Image */}
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={`max-w-full max-h-[70vh] object-contain transition-transform duration-150 ease-out ${
            mode === 'pan' ? 'cursor-grab active:cursor-grabbing' : ''
          }`}
          style={
            mode === 'pan'
              ? {
                  transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
                }
              : {}
          }
        />

        {/* Floating Instructions Banner */}
        {!isHovered && mode === 'lens' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-2xl bg-black/85 backdrop-blur-md border border-[#D4AF37]/60 text-[#F4E08B] text-xs font-bold flex items-center gap-2 pointer-events-none shadow-2xl animate-bounce">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <span>حرك الماوس أو العجلة للاستكشاف والتحكم بالدقة 🔍</span>
          </div>
        )}

        {/* Touch indicator */}
        {touchActive && (
          <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-amber-950/90 border border-amber-500/60 text-amber-200 text-[10px] font-bold flex items-center gap-1 z-30 pointer-events-none shadow-lg">
            <Smartphone className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>عدسة اللمس نشطة</span>
          </div>
        )}

        {/* Interactive Optical Lens Overlay */}
        {mode === 'lens' && (isHovered || isLensLocked) && (
          <div
            className="absolute pointer-events-none rounded-full border-2 border-[#D4AF37] shadow-[0_0_35px_rgba(212,175,55,0.8),inset_0_0_20px_rgba(212,175,55,0.4)] z-30 overflow-hidden bg-no-repeat transition-opacity duration-100"
            style={{
              width: `${lensSize}px`,
              height: `${lensSize}px`,
              left: `${lensPosition.x - lensSize / 2}px`,
              top: `${lensPosition.y - lensSize / 2}px`,
              backgroundImage: `url("${src}")`,
              backgroundPosition: bgStyle.backgroundPosition,
              backgroundSize: bgStyle.backgroundSize,
            }}
          >
            {/* Glass shine reflection effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent pointer-events-none" />

            {/* Precision Crosshair Target */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50">
              <div className="w-5 h-[1px] bg-[#D4AF37]" />
              <div className="h-5 w-[1px] bg-[#D4AF37] absolute" />
            </div>

            {/* Zoom Factor Tag */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-black/85 border border-[#D4AF37]/70 text-[#F4E08B] text-[10px] font-black tracking-widest shadow-md">
              {zoomLevel.toFixed(1)}x
            </div>
          </div>
        )}

        {/* Lock Lens Toggle Indicator */}
        {mode === 'lens' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsLensLocked(!isLensLocked);
            }}
            className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-bold z-30 flex items-center gap-1.5 transition-all shadow-lg cursor-pointer ${
              isLensLocked
                ? 'bg-emerald-950/90 border border-emerald-500/70 text-emerald-300'
                : 'bg-black/60 border border-[#3D2C1E] text-[#C8BFB0] hover:text-[#FFF1C5] hover:border-[#D4AF37]'
            }`}
          >
            {isLensLocked ? <Lock className="w-3 h-3 text-emerald-400" /> : <Unlock className="w-3 h-3" />}
            <span>{isLensLocked ? 'العدسة مثبتة' : 'انقر لتثبيت العدسة'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

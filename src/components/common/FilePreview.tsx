import React, { useState } from 'react';
import { Download, ZoomIn, ZoomOut, X, FileText, File } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilePreviewProps {
  src: string;
  type: 'image' | 'pdf' | 'document';
  alt?: string;
  className?: string;
}

export default function FilePreview({ src, type, alt = '파일 미리보기', className }: FilePreviewProps) {
  const [scale, setScale] = useState(1);
  const [lightbox, setLightbox] = useState(false);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = src;
    a.download = alt;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  };

  const zoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const zoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));

  return (
    <>
      {/* 미리보기 카드 */}
      <div className={cn('relative rounded-xl border border-line bg-surface-secondary overflow-hidden', className)}>
        {/* 툴바 */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
          {type === 'image' && (
            <>
              <button
                onClick={zoomOut}
                className="w-7 h-7 bg-white/90 backdrop-blur rounded-lg flex items-center justify-center text-content-secondary hover:text-content shadow-sm transition-colors"
                title="축소"
              >
                <ZoomOut size={13} />
              </button>
              <button
                onClick={zoomIn}
                className="w-7 h-7 bg-white/90 backdrop-blur rounded-lg flex items-center justify-center text-content-secondary hover:text-content shadow-sm transition-colors"
                title="확대"
              >
                <ZoomIn size={13} />
              </button>
            </>
          )}
          <button
            onClick={handleDownload}
            className="w-7 h-7 bg-white/90 backdrop-blur rounded-lg flex items-center justify-center text-content-secondary hover:text-content shadow-sm transition-colors"
            title="다운로드"
          >
            <Download size={13} />
          </button>
        </div>

        {/* 콘텐츠 영역 */}
        <div className="flex items-center justify-center min-h-[200px] p-4 overflow-auto">
          {type === 'image' && (
            <img
              src={src}
              alt={alt}
              onClick={() => setLightbox(true)}
              style={{ transform: `scale(${scale})`, transformOrigin: 'center', transition: 'transform 0.2s' }}
              className="max-w-full max-h-[400px] object-contain rounded cursor-zoom-in"
            />
          )}
          {type === 'pdf' && (
            <iframe
              src={src}
              title={alt}
              className="w-full min-h-[400px] rounded border-0"
            />
          )}
          {type === 'document' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-16 h-16 rounded-xl bg-primary-light flex items-center justify-center">
                <FileText className="text-primary" size={28} />
              </div>
              <p className="text-[13px] font-medium text-content">{alt}</p>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors"
              >
                <Download size={13} />
                다운로드
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 라이트박스 */}
      {lightbox && type === 'image' && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
            onClick={() => setLightbox(false)}
          >
            <X size={18} />
          </button>
          <div className="absolute bottom-4 right-4 flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); zoomOut(); }}
              className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-colors"
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-white text-[12px] w-12 text-center">{Math.round(scale * 100)}%</span>
            <button
              onClick={(e) => { e.stopPropagation(); zoomIn(); }}
              className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-colors"
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDownload(); }}
              className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-colors"
            >
              <Download size={14} />
            </button>
          </div>
          <img
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            style={{ transform: `scale(${scale})`, transition: 'transform 0.2s' }}
            className="max-w-full max-h-[85vh] object-contain rounded-lg cursor-default"
          />
        </div>
      )}
    </>
  );
}

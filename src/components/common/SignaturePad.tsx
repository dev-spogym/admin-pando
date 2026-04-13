import React, { useRef, useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface SignaturePadProps {
  onSign: (dataUrl: string) => void;
  width?: number;
  height?: number;
  className?: string;
}

export default function SignaturePad({
  onSign,
  width = 560,
  height = 200,
  className,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  // 실행취소를 위한 스냅샷 스택
  const historyRef = useRef<ImageData[]>([]);

  const [hasSigned, setHasSigned] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // 캔버스 좌표 계산 (DPR 대응)
  const getPos = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const getCtx = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    return { canvas, ctx };
  };

  const saveSnapshot = () => {
    const res = getCtx();
    if (!res) return;
    const { canvas, ctx } = res;
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    // 스택 최대 30개 유지
    if (historyRef.current.length > 30) historyRef.current.shift();
  };

  const startDraw = useCallback((x: number, y: number) => {
    const res = getCtx();
    if (!res) return;
    const { ctx } = res;
    saveSnapshot();
    isDrawingRef.current = true;
    lastPosRef.current = { x, y };
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, []);

  const draw = useCallback((x: number, y: number) => {
    if (!isDrawingRef.current || !lastPosRef.current) return;
    const res = getCtx();
    if (!res) return;
    const { ctx } = res;

    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 부드러운 곡선 (이전 점과 현재 점의 중간값 사용)
    const midX = (lastPosRef.current.x + x) / 2;
    const midY = (lastPosRef.current.y + y) / 2;
    ctx.quadraticCurveTo(lastPosRef.current.x, lastPosRef.current.y, midX, midY);
    ctx.stroke();

    lastPosRef.current = { x, y };
    setHasSigned(true);
    setConfirmed(false);
  }, []);

  const endDraw = useCallback(() => {
    isDrawingRef.current = false;
    lastPosRef.current = null;
  }, []);

  // 마우스 이벤트
  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getPos(canvas, e.clientX, e.clientY);
    startDraw(pos.x, pos.y);
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getPos(canvas, e.clientX, e.clientY);
    draw(pos.x, pos.y);
  };

  const onMouseUp = () => endDraw();
  const onMouseLeave = () => endDraw();

  // 터치 이벤트
  const onTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const touch = e.touches[0];
    const pos = getPos(canvas, touch.clientX, touch.clientY);
    startDraw(pos.x, pos.y);
  };

  const onTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const touch = e.touches[0];
    const pos = getPos(canvas, touch.clientX, touch.clientY);
    draw(pos.x, pos.y);
  };

  const onTouchEnd = () => endDraw();

  const handleClear = () => {
    const res = getCtx();
    if (!res) return;
    const { canvas, ctx } = res;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    historyRef.current = [];
    setHasSigned(false);
    setConfirmed(false);
  };

  const handleUndo = () => {
    const res = getCtx();
    if (!res) return;
    const { canvas, ctx } = res;
    const snapshot = historyRef.current.pop();
    if (snapshot) {
      ctx.putImageData(snapshot, 0, 0);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSigned(false);
      setConfirmed(false);
    }
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSigned) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSign(dataUrl);
    setConfirmed(true);
  };

  // 캔버스 초기화 (배경 흰색)
  useEffect(() => {
    const res = getCtx();
    if (!res) return;
    const { canvas, ctx } = res;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  return (
    <div className={cn('flex flex-col gap-sm', className)}>
      {/* 캔버스 영역 */}
      <div className="relative rounded-xl border-2 border-dashed border-line bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full touch-none cursor-crosshair"
          style={{ display: 'block' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />
        {/* 서명 가이드 텍스트 (서명 전만 표시) */}
        {!hasSigned && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-content-secondary text-Body-2 select-none">이곳에 서명하세요</p>
          </div>
        )}
        {/* 하단 서명선 */}
        <div className="absolute bottom-[36px] left-[24px] right-[24px] h-[1px] bg-line pointer-events-none" />
        <p className="absolute bottom-[14px] left-1/2 -translate-x-1/2 text-[11px] text-content-secondary pointer-events-none select-none">
          서명
        </p>
      </div>

      {/* 버튼 영역 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-sm">
          <button
            type="button"
            onClick={handleUndo}
            disabled={!hasSigned}
            className="px-md py-sm rounded-button text-Label text-content-secondary border border-line hover:bg-surface-secondary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            실행취소
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={!hasSigned}
            className="px-md py-sm rounded-button text-Label text-state-error border border-state-error/30 hover:bg-state-error/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            지우기
          </button>
        </div>

        {confirmed ? (
          <div className="flex items-center gap-xs text-state-success text-Body-2 font-semibold">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            서명 완료
          </div>
        ) : (
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!hasSigned}
            className="px-lg py-sm rounded-button text-Label bg-primary text-white font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            서명 확인
          </button>
        )}
      </div>
    </div>
  );
}

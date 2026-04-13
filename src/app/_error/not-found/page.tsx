import React from 'react';
import { moveToPage } from '@/internal';

// 404 NotFound 페이지 - AppLayout 없이 독립 렌더링
export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        {/* 404 큰 숫자 */}
        <p className="text-[120px] font-extrabold leading-none text-primary opacity-20 select-none">
          404
        </p>

        {/* 제목 */}
        <h1 className="mt-4 text-2xl font-bold text-content">
          페이지를 찾을 수 없습니다
        </h1>

        {/* 설명 */}
        <p className="mt-3 text-sm text-content-secondary leading-relaxed">
          요청하신 페이지가 삭제되었거나 주소가 변경되었을 수 있습니다.
          <br />
          URL을 다시 확인하거나 아래 버튼을 이용해 주세요.
        </p>

        {/* 버튼 영역 */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => moveToPage(966)}
            className="px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            대시보드로 이동
          </button>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-2.5 rounded-lg border border-border text-content text-sm font-medium hover:bg-surface-secondary transition-colors"
          >
            이전 페이지로
          </button>
        </div>
      </div>
    </div>
  );
}

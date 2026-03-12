import React from 'react';
import { ShieldX } from 'lucide-react';
import { moveToPage } from '@/internal';

// 403 접근 거부 페이지 - AppLayout 없이 독립 렌더링
export default function Forbidden() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        {/* 403 큰 숫자 */}
        <p className="text-[120px] font-extrabold leading-none text-primary opacity-20 select-none">
          403
        </p>

        {/* 아이콘 + 제목 */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <ShieldX className="text-content-secondary" size={24} />
          <h1 className="text-2xl font-bold text-content">
            접근 권한이 없습니다
          </h1>
        </div>

        {/* 설명 */}
        <p className="mt-3 text-sm text-content-secondary leading-relaxed">
          이 페이지에 접근할 수 있는 권한이 부족합니다.
          <br />
          관리자에게 문의하거나 대시보드로 이동해 주세요.
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

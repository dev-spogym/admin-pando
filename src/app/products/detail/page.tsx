'use client';
export const dynamic = 'force-dynamic';

import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { CalendarDays, CheckCircle2, History, Package, Tag, Users } from 'lucide-react';

const product = {
  name: '프리미엄 PT 12회권',
  status: '활성',
  category: 'PT',
  subCategory: '개인 PT',
  cashPrice: '720,000원',
  cardPrice: '760,000원',
  duration: '3개월',
  sessions: '12회',
  lessonTime: '50분',
  useType: '횟수',
  tag: '재등록 추천',
  sales: '48건',
};

const options = [
  ['예약 가능', true],
  ['시설 이용', true],
  ['홀딩 가능', true],
  ['양도 가능', false],
  ['포인트 적립', true],
  ['키오스크 노출', false],
] as const;

export default function ProductDetailPage() {
  return (
    <AppLayout>
      <PageHeader
        title="상품 상세 패널"
        description="상품 목록에서 선택한 상품의 설정값, 옵션, 가격 이력, 판매 현황을 확인합니다"
      />

      <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        퍼블리싱 완료 / 데이터 미연동: 실제 상품 원장과 가격 이력은 후속 연동 대상입니다. 목록 내 우측 패널 UX와 직접 route 검수를 함께 지원합니다.
      </div>

      <div className="grid grid-cols-[1fr_360px] gap-6">
        <section className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">{product.status}</span>
              </div>
              <p className="text-sm text-gray-500">상품 마스터 1단계/2단계 분류와 판매 옵션을 한 화면에서 검수합니다.</p>
            </div>
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">수정</button>
          </div>

          <div className="grid grid-cols-2 gap-4 p-6">
            {[
              ['상품 대분류', product.category],
              ['종목·세부종목', product.subCategory],
              ['현금가', product.cashPrice],
              ['카드가', product.cardPrice],
              ['이용 기간', product.duration],
              ['이용 횟수', product.sessions],
              ['레슨 시간', product.lessonTime],
              ['이용 구분', product.useType],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="mt-1 font-semibold text-gray-900">{value}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Tag className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-gray-900">옵션 현황</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {options.map(([label, enabled]) => (
                <div key={label} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                  <span className="text-sm text-gray-700">{label}</span>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {enabled ? 'ON' : 'OFF'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-900">판매 현황</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{product.sales}</p>
            <p className="mt-1 text-xs text-gray-500">누적 판매 건수 목업</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <History className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-semibold text-gray-900">가격 변경 이력</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="font-semibold text-gray-900">680,000원 → 720,000원</p>
                <p className="mt-1 text-xs text-gray-500">2026-04-15 · 관리자</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="font-semibold text-gray-900">시즌 할인 종료</p>
                <p className="mt-1 text-xs text-gray-500">2026-03-31 · 자동 정책</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-700">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4" /> GX 분류 규칙
            </div>
            GX 상품은 요가·필라테스·스피닝·줌바·에어로빅·GX 기타 중 하나를 필수 표시합니다.
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <CalendarDays className="h-4 w-4 text-slate-500" /> 이용 요일·시간
            </div>
            <p className="text-sm text-gray-600">월~금 09:00~22:00, 토 10:00~18:00</p>
          </div>
        </aside>
      </div>
    </AppLayout>
  );
}

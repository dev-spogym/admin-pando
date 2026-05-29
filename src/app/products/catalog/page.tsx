'use client';
export const dynamic = 'force-dynamic';

import React, { useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { Download, Eye, Grid, List, Pencil, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { usePageSeed } from '@/hooks';
import type { ProductCatalogSeedPayload } from '@/lib/publishingPageSeed';
import {
  CatalogPreviewModal,
  CatalogDisplayOptionsModal,
  CatalogEditModal,
  DEFAULT_CATALOG_OPTIONS,
  type CatalogDisplayOptions,
} from '@/components/common/CatalogModals';

const FALLBACK_CATALOG: ProductCatalogSeedPayload = {
  products: [
    { id: 1, name: 'PT 10회권', category: 'PT', price: 500000, desc: '1:1 퍼스널 트레이닝 10회 이용권', active: true, popular: true },
    { id: 2, name: '3개월 이용권', category: '이용권', price: 180000, desc: '헬스장 3개월 자유 이용', active: true, popular: true },
    { id: 3, name: '필라테스 월정액', category: 'GX:필라테스', price: 120000, desc: '필라테스 그룹 수업 월 무제한', active: true, popular: false },
    { id: 4, name: '요가 10회권', category: 'GX:요가', price: 80000, desc: '요가 그룹 수업 10회 이용권', active: true, popular: false },
    { id: 5, name: '락커 3개월', category: '락커', price: 60000, desc: '개인 락커 3개월 이용', active: true, popular: false },
    { id: 6, name: '운동복 대여', category: '운동복', price: 2000, desc: '운동복 1일 대여', active: true, popular: false },
    { id: 7, name: '스포츠 타월', category: '일반', price: 8000, desc: '극세사 스포츠 타월', active: true, popular: false },
    { id: 8, name: '스피닝 20회권', category: 'GX:스피닝', price: 150000, desc: '스피닝 그룹 수업 20회', active: false, popular: false },
  ],
};

// docs4 SCR-P005: 1단계 상품 대분류 고정 탭 (회원권 / 수강권 / 락커 / 운동복 / 일반)
const MAJOR_CATEGORIES = ['회원권', '수강권', '락커', '운동복', '일반'] as const;
type MajorCategory = (typeof MAJOR_CATEGORIES)[number];
// GX 세부종목 (2단계 필터)
const GX_SUBCATEGORIES = ['요가', '필라테스', '스피닝', '줌바', 'GX 기타'];

// seed category → 대분류 매핑
const toMajor = (category: string): MajorCategory => {
  if (category === 'PT' || category.startsWith('GX')) return '수강권';
  if (category === '이용권') return '회원권';
  if (category === '락커') return '락커';
  if (category === '운동복') return '운동복';
  return '일반';
};

// GX 세부종목 추출 (category 형식 "GX:필라테스")
const gxSub = (category: string): string | null => (category.startsWith('GX:') ? category.slice(3) : null);

const majorColor: Record<MajorCategory, string> = {
  '회원권': 'bg-blue-100 text-blue-700',
  '수강권': 'bg-purple-100 text-purple-700',
  '락커': 'bg-teal-100 text-teal-700',
  '운동복': 'bg-amber-100 text-amber-700',
  '일반': 'bg-gray-100 text-gray-600',
};

export default function ProductCatalogPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [cat, setCat] = useState<'전체' | MajorCategory>('전체');
  const [gxFilter, setGxFilter] = useState('전체');
  // DLG-P016~P018 모달 상태
  const [previewOpen, setPreviewOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [options, setOptions] = useState<CatalogDisplayOptions>(DEFAULT_CATALOG_OPTIONS);

  const { data, loading, error, branchId, snapshotDate, reload } = usePageSeed<ProductCatalogSeedPayload>(
    '/products/catalog',
    FALLBACK_CATALOG,
  );

  // 카탈로그는 활성 상품만 노출 (docs4: 비활성 상품 제외)
  const activeProducts = useMemo(() => data.products.filter(p => p.active), [data.products]);

  const filtered = useMemo(
    () =>
      activeProducts.filter(p => {
        if (cat !== '전체' && toMajor(p.category) !== cat) return false;
        if (cat === '수강권' && gxFilter !== '전체') {
          const sub = gxSub(p.category);
          if (sub !== gxFilter) return false;
        }
        return true;
      }),
    [activeProducts, cat, gxFilter],
  );

  const handleCatChange = (next: '전체' | MajorCategory) => {
    setCat(next);
    if (next !== '수강권') setGxFilter('전체');
  };

  const resetFilter = () => {
    setCat('전체');
    setGxFilter('전체');
  };

  return (
    <AppLayout>
      <PageHeader title="상품 카탈로그" description="고객에게 제공하는 상품 목록을 카탈로그 형태로 확인합니다" actions={
        <div className="flex flex-wrap gap-2">
          <button
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={() => void reload(true)}
            type="button"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> seed 갱신
          </button>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Eye className="w-4 h-4" /> 미리보기
          </button>
          <button
            type="button"
            onClick={() => setOptionsOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <SlidersHorizontal className="w-4 h-4" /> 표시 옵션
          </button>
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Pencil className="w-4 h-4" /> 내용 편집
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            <Download className="w-4 h-4" /> PDF 내보내기
          </button>
        </div>
      } />

      <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
        Supabase snapshot · 지점 {branchId} · 기준일 {snapshotDate ?? '-'}
        {error && <span className="ml-2 text-red-600">Fallback 사용: {error}</span>}
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col gap-2">
          {/* 1단계 대분류 고정 탭 */}
          <div className="flex flex-wrap gap-2">
            {(['전체', ...MAJOR_CATEGORIES] as const).map(c => (
              <button key={c} onClick={() => handleCatChange(c)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${cat === c ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                {c}
              </button>
            ))}
          </div>
          {/* 2단계 GX 세부종목 필터 (수강권 탭에서만 표시) */}
          {cat === '수강권' && (
            <div className="flex flex-wrap gap-1.5">
              {['전체', ...GX_SUBCATEGORIES].map(s => (
                <button key={s} onClick={() => setGxFilter(s)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${gxFilter === s ? 'bg-purple-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1">
          <button onClick={() => setView('grid')} className={`p-1.5 rounded ${view === 'grid' ? 'bg-gray-100' : 'text-gray-400'}`}><Grid className="w-4 h-4" /></button>
          <button onClick={() => setView('list')} className={`p-1.5 rounded ${view === 'list' ? 'bg-gray-100' : 'text-gray-400'}`}><List className="w-4 h-4" /></button>
        </div>
      </div>

      {loading && activeProducts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-20 text-center text-sm text-gray-400">
          카탈로그를 불러오는 중입니다...
        </div>
      ) : activeProducts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-20 text-center text-sm text-gray-500">
          표시할 상품이 없습니다.
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-20 text-center">
          <p className="text-sm text-gray-500">필터 결과 없음</p>
          <button type="button" onClick={resetFilter} className="mt-3 text-sm font-medium text-blue-600 hover:underline">
            초기화
          </button>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map(p => {
            const major = toMajor(p.category);
            const sub = gxSub(p.category);
            return (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${majorColor[major]}`}>{major}</span>
                    {sub && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">{sub}</span>}
                  </div>
                  {p.popular && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">인기</span>}
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">{p.name}</h3>
                <p className="text-xs text-gray-500 mb-4">{p.desc}</p>
                <p className="text-lg font-bold text-blue-600">{p.price.toLocaleString()}원</p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {filtered.map(p => {
            const major = toMajor(p.category);
            const sub = gxSub(p.category);
            return (
              <div key={p.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${majorColor[major]}`}>{major}</span>
                    {sub && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">{sub}</span>}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.desc}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-blue-600">{p.price.toLocaleString()}원</span>
              </div>
            );
          })}
        </div>
      )}

      {/* DLG-P016 카탈로그 미리보기 */}
      <CatalogPreviewModal isOpen={previewOpen} onClose={() => setPreviewOpen(false)} products={activeProducts} showPrice={options.showPrice} />
      {/* DLG-P017 카탈로그 표시 옵션 설정 */}
      <CatalogDisplayOptionsModal isOpen={optionsOpen} onClose={() => setOptionsOpen(false)} value={options} onSave={setOptions} />
      {/* DLG-P018 카탈로그 내용 편집 */}
      <CatalogEditModal isOpen={editOpen} onClose={() => setEditOpen(false)} products={activeProducts} onSave={() => void reload(true)} />
    </AppLayout>
  );
}

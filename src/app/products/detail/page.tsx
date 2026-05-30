'use client';
export const dynamic = 'force-dynamic';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { CalendarDays, CheckCircle2, History, Image as ImageIcon, Package, Tag, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getBranchId } from '@/lib/getBranchId';
import { formatKRW } from '@/lib/format';

interface ProductDetail {
  id: number;
  name: string;
  status: string;
  category: string;
  productType: string | null;
  cashPrice: number;
  cardPrice: number | null;
  duration: number | null;
  sessions: number | null;
  lessonTime: string | null;
  useType: string | null;
  tag: string | null;
  imageUrl: string | null;
  options: Array<[string, boolean]>;
  availableTime: string;
}

interface PriceHistory {
  id: number;
  createdAt: string;
  title: string;
  userName: string;
}

const CATEGORY_KO: Record<string, string> = {
  MEMBERSHIP: '회원권',
  PT: 'PT',
  GX: 'GX',
  PRODUCT: '일반',
  SERVICE: '일반',
};

const PRODUCT_TYPE_KO: Record<string, string> = {
  MEMBERSHIP: '회원권',
  LESSON: '수강권',
  RENTAL: '락커',
  GENERAL: '일반',
};

const parseRestrictions = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object') return {};
  return value as Record<string, unknown>;
};

function ProductDetailContent() {
  const searchParams = useSearchParams();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [salesCount, setSalesCount] = useState(0);
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      const requestedId = searchParams?.get('id');
      const branchId = getBranchId();

      let query = supabase.from('products').select('*').eq('branchId', branchId);
      query = requestedId ? query.eq('id', Number(requestedId)) : query.order('id').limit(1);
      const { data, error: productError } = await query.maybeSingle();

      if (productError || !data) {
        setError(productError?.message ?? '조회 가능한 상품이 없습니다.');
        setProduct(null);
        setLoading(false);
        return;
      }

      const row = data as Record<string, unknown>;
      const restrictions = parseRestrictions(row.usage_restrictions);
      const availableStart = restrictions.availableTimeStart as string | undefined;
      const availableEnd = restrictions.availableTimeEnd as string | undefined;
      const mapped: ProductDetail = {
        id: Number(row.id),
        name: String(row.name ?? ''),
        status: row.isActive ? '활성' : '비활성',
        category: CATEGORY_KO[String(row.category)] ?? String(row.category ?? '-'),
        productType: row.productType ? PRODUCT_TYPE_KO[String(row.productType)] ?? String(row.productType) : null,
        cashPrice: Number(row.cashPrice ?? row.price ?? 0),
        cardPrice: row.cardPrice == null ? null : Number(row.cardPrice),
        duration: row.duration == null ? null : Number(row.duration),
        sessions: row.sessions == null ? null : Number(row.sessions),
        lessonTime: (restrictions.lessonTime as string | null | undefined) ?? null,
        useType: (row.deductionType as string | null | undefined) ?? null,
        tag: (row.tag as string | null | undefined) ?? null,
        imageUrl: (row.imageUrl as string | null | undefined) ?? null,
        options: [
          ['예약 가능', Boolean(restrictions.reservationAvailable)],
          ['시설 이용', Boolean(restrictions.facilityAvailable)],
          ['홀딩 가능', Boolean(row.holdingEnabled)],
          ['양도 가능', Boolean(row.transferEnabled)],
          ['포인트 적립', row.pointAccrual !== false],
          ['키오스크 노출', row.kioskVisible !== false],
        ],
        availableTime: availableStart && availableEnd ? `${availableStart}~${availableEnd}` : '전체 시간',
      };

      const [{ count }, { data: auditRows }] = await Promise.all([
        supabase
          .from('sales')
          .select('id', { count: 'exact', head: true })
          .eq('branchId', branchId)
          .eq('productName', mapped.name)
          .eq('status', 'COMPLETED'),
        supabase
          .from('audit_log')
          .select('id, createdAt, beforeValue, afterValue, detail')
          .eq('targetType', 'product')
          .eq('targetId', mapped.id)
          .eq('action', 'UPDATE')
          .order('createdAt', { ascending: false })
          .limit(10),
      ]);

      setProduct(mapped);
      setSalesCount(count ?? 0);
      setHistory(
        ((auditRows ?? []) as Array<Record<string, unknown>>).map(item => {
          const beforeValue = (item.beforeValue ?? {}) as Record<string, unknown>;
          const afterValue = (item.afterValue ?? {}) as Record<string, unknown>;
          const detail = (item.detail ?? {}) as Record<string, unknown>;
          const beforePrice = beforeValue.price as number | undefined;
          const afterPrice = afterValue.price as number | undefined;
          return {
            id: Number(item.id),
            createdAt: new Date(String(item.createdAt)).toLocaleString('ko-KR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            }),
            title: beforePrice != null || afterPrice != null
              ? `${beforePrice != null ? formatKRW(Number(beforePrice)) : '?'} -> ${afterPrice != null ? formatKRW(Number(afterPrice)) : '?'}`
              : '상품 정보 수정',
            userName: String(detail.userName ?? ''),
          };
        }),
      );
      setLoading(false);
    };

    fetchDetail();
  }, [searchParams]);

  return (
    <AppLayout>
      <PageHeader
        title="상품 상세 패널"
        description="상품 목록에서 선택한 상품의 설정값, 옵션, 가격 이력, 판매 현황을 확인합니다"
      />

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-16 text-center text-sm text-gray-400">
          상품 정보를 불러오는 중입니다...
        </div>
      ) : error || !product ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-8 text-sm text-red-700">
          {error ?? '상품 정보를 찾을 수 없습니다.'}
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_360px] gap-6">
          <section className="rounded-xl border border-gray-200 bg-white">
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${product.status === '활성' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {product.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500">실제 상품 원장 기준으로 상세/수정 패널 검수 정보를 표시합니다.</p>
              </div>
            </div>

            <div className="grid grid-cols-[160px_1fr] gap-4 p-6">
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.imageUrl} alt="상품 대표 이미지" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-gray-300" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['상품 대분류', product.category],
                  ['상품 유형', product.productType ?? '-'],
                  ['현금가', formatKRW(product.cashPrice)],
                  ['카드가', product.cardPrice == null ? '-' : formatKRW(product.cardPrice)],
                  ['이용 기간', product.duration == null ? '-' : `${product.duration}일`],
                  ['이용 횟수', product.sessions == null ? '-' : `${product.sessions}회`],
                  ['레슨 시간', product.lessonTime ?? '-'],
                  ['이용 구분', product.useType ?? '-'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="mt-1 font-semibold text-gray-900">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 p-6">
              <div className="mb-4 flex items-center gap-2">
                <Tag className="h-4 w-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-gray-900">옵션 현황</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {product.options.map(([label, enabled]) => (
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
              <p className="text-3xl font-bold text-gray-900">{salesCount}건</p>
              <p className="mt-1 text-xs text-gray-500">완료 매출 기준 누적 판매 건수</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-3 flex items-center gap-2">
                <History className="h-4 w-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-gray-900">가격 변경 이력</h3>
              </div>
              <div className="space-y-3 text-sm">
                {history.length === 0 ? (
                  <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">가격 변경 이력이 없습니다.</p>
                ) : history.map(item => (
                  <div key={item.id} className="rounded-lg bg-gray-50 p-3">
                    <p className="font-semibold text-gray-900">{item.title}</p>
                    <p className="mt-1 text-xs text-gray-500">{item.createdAt}{item.userName ? ` · ${item.userName}` : ''}</p>
                  </div>
                ))}
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
              <p className="text-sm text-gray-600">{product.availableTime}</p>
            </div>
          </aside>
        </div>
      )}
    </AppLayout>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense>
      <ProductDetailContent />
    </Suspense>
  );
}

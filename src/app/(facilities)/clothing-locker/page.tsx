'use client';
export const dynamic = 'force-dynamic';

// SCR-I005 고정 물품 락커 관리 (docs4 V1/V2 D11-통합운영)
// 개인 물품 / 골프 / 프리미엄 계약 기반 고정 락커 배정·연장·회수·상태동기화.
// 본문은 FixedLockerSection 컴포넌트로 추출되어 /locker/management 탭과 공통 사용.

import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import FixedLockerSection from '@/components/facilities/FixedLockerSection';

export default function ClothingLockerPage() {
  return (
    <AppLayout>
      <PageHeader
        title="고정 물품 락커 관리"
        description="개인 물품·골프·프리미엄 고정 락커의 계약 배정 현황을 관리합니다."
      />
      <FixedLockerSection embedded />
    </AppLayout>
  );
}

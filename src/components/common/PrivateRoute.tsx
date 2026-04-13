'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { hasPermission } from '@/lib/permissions';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userRole = useAuthStore((s) => s.user?.role) || '';
  const isSuperAdmin = useAuthStore((s) => s.user?.isSuperAdmin) ?? false;

  useEffect(() => {
    // 미인증 -> 로그인 페이지
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    // 역할 기반 접근 제어 (슈퍼관리자 bypass)
    if (pathname && !hasPermission(userRole, pathname, isSuperAdmin)) {
      router.replace('/forbidden');
    }
  }, [isAuthenticated, userRole, pathname, isSuperAdmin, router]);

  // 미인증이거나 권한 없으면 렌더링하지 않음
  if (!isAuthenticated) {
    return null;
  }

  if (pathname && !hasPermission(userRole, pathname, isSuperAdmin)) {
    return null;
  }

  return <>{children}</>;
}

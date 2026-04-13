import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { hasPermission } from '@/lib/permissions';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userRole = useAuthStore((s) => s.user?.role) || '';
  const isSuperAdmin = useAuthStore((s) => s.user?.isSuperAdmin) ?? false;
  const location = useLocation();

  // 미인증 -> 로그인 페이지
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 역할 기반 접근 제어 (슈퍼관리자 bypass)
  if (!hasPermission(userRole, location.pathname, isSuperAdmin)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
}

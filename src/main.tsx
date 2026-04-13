import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { Toast } from './components/ui/Toast';
import './index.css';

/** React Query 클라이언트 설정 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 윈도우 포커스 시 자동 리패치 비활성화
      refetchOnWindowFocus: false,
      // 에러 발생 시 재시도 1회
      retry: 1,
      // 5분간 캐시 유지
      staleTime: 5 * 60 * 1000,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        {/* 전역 Toast 알림 — 앱 어디서나 toast.success() 등으로 호출 가능 */}
        <Toast />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);

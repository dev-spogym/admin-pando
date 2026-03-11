import React, { Component, ErrorInfo } from 'react';

interface Props {
  children: React.ReactNode;
  // 커스텀 폴백 UI (선택)
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// React 클래스 기반 Error Boundary
// 함수형 컴포넌트에서는 error boundary를 구현할 수 없어 클래스 사용
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 에러 로깅 (추후 Sentry 등 연동 포인트)
    console.error('[ErrorBoundary] 렌더링 에러:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (!hasError) return children;

    // 커스텀 폴백이 있으면 우선 사용
    if (fallback) return fallback;

    // 기본 폴백 UI
    return (
      <div className="min-h-screen bg-2 flex items-center justify-center p-md">
        <div className="bg-3 rounded-card-strong shadow-3 p-xl max-w-md w-full text-center">
          {/* 에러 아이콘 */}
          <div className="w-16 h-16 rounded-full bg-6 flex items-center justify-center mx-auto mb-lg">
            <svg
              className="w-8 h-8 text-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          </div>

          <h2 className="text-Section-Title text-4 mb-sm">
            오류가 발생했습니다
          </h2>

          {/* 에러 메시지 */}
          {error?.message && (
            <p className="text-Body-Primary-KR text-5 mb-lg bg-2 rounded-1 px-md py-sm break-all">
              {error.message}
            </p>
          )}

          <p className="text-Body-Primary-KR text-5 mb-xl">
            페이지를 새로고침하거나 관리자에게 문의하세요.
          </p>

          <button
            onClick={this.handleReset}
            className="w-full bg-0 text-3 rounded-button py-sm px-md text-Section-Title hover:opacity-90 transition-opacity"
          >
            새로고침
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;

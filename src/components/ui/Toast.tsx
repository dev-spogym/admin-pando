import { Toaster } from 'sonner';

/**
 * 프로젝트 테마에 맞게 스타일링된 Toast 컴포넌트
 *
 * 사용 예시:
 *   import { toast } from 'sonner';
 *
 *   toast.success('저장되었습니다');
 *   toast.error('오류가 발생했습니다');
 *   toast.info('알림 메시지입니다');
 *   toast.warning('주의가 필요합니다');
 *   toast.loading('처리 중...');
 *
 * main.tsx 또는 최상위 컴포넌트에 <Toast /> 를 한 번만 배치하세요.
 */
export function Toast() {
  return (
    <Toaster
      position="top-right"
      expand={false}
      richColors
      closeButton
      duration={3500}
      toastOptions={{
        style: {
          // 프로젝트 폰트 적용
          fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          fontSize: '14px',
          borderRadius: '12px',
          border: '1px solid #EDF2F7',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
        },
        classNames: {
          toast: 'font-sans',
          title: 'font-semibold',
          description: 'text-[#718096]',
        },
      }}
    />
  );
}

export default Toast;

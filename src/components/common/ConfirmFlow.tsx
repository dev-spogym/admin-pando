import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConfirmFlowStep {
  title: string;
  description: string;
  confirmText?: string; // 마지막 단계에서 입력 확인용 텍스트
}

interface ConfirmFlowProps {
  steps: ConfirmFlowStep[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export default function ConfirmFlow({
  steps,
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: ConfirmFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [inputValue, setInputValue] = useState('');

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const needsInput = isLastStep && !!step?.confirmText;

  const canProceed = needsInput ? inputValue === step.confirmText : true;

  // 열릴 때마다 초기화
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setInputValue('');
    }
  }, [isOpen]);

  // ESC 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || !step) return null;

  const handleNext = () => {
    if (isLastStep) {
      onConfirm();
    } else {
      setCurrentStep((prev) => prev + 1);
      setInputValue('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 모달 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* 상단 경고 아이콘 */}
        <div className="bg-red-50 px-6 pt-6 pb-4 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="text-red-500" size={24} />
          </div>
          <h2 className="text-[16px] font-bold text-content">{step.title}</h2>
          <p className="text-[13px] text-content-secondary mt-1">{step.description}</p>
        </div>

        {/* 단계 표시 */}
        {steps.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 py-3 px-6 border-b border-line">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  idx < currentStep
                    ? 'bg-primary w-6'
                    : idx === currentStep
                    ? 'bg-primary w-8'
                    : 'bg-line w-6'
                )}
              />
            ))}
            <span className="ml-2 text-[11px] text-content-tertiary">
              {currentStep + 1} / {steps.length}
            </span>
          </div>
        )}

        {/* 완료된 단계 목록 */}
        {currentStep > 0 && (
          <div className="px-6 pt-4 space-y-2">
            {steps.slice(0, currentStep).map((s, idx) => (
              <div key={idx} className="flex items-center gap-2 text-[12px] text-content-secondary">
                <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                <span>{s.title} 확인 완료</span>
              </div>
            ))}
          </div>
        )}

        {/* 텍스트 입력 확인 (마지막 단계) */}
        {needsInput && (
          <div className="px-6 pt-4">
            <p className="text-[12px] text-content-secondary mb-2">
              계속하려면{' '}
              <span className="font-semibold text-red-500">"{step.confirmText}"</span>를 입력하세요.
            </p>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={step.confirmText}
              className="w-full px-3 py-2 text-[13px] border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
              autoFocus
            />
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="flex gap-3 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-[13px] font-medium text-content-secondary bg-surface-secondary hover:bg-line rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed || isLoading}
            className={cn(
              'flex-1 px-4 py-2.5 text-[13px] font-semibold rounded-lg transition-colors',
              isLastStep
                ? 'bg-red-500 hover:bg-red-600 text-white disabled:opacity-40'
                : 'bg-primary hover:bg-primary-dark text-white disabled:opacity-40'
            )}
          >
            {isLoading ? '처리 중...' : isLastStep ? '최종 확인' : '다음 단계'}
          </button>
        </div>
      </div>
    </div>
  );
}

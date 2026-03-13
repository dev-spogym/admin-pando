import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  confirmationText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "확인",
  cancelLabel = "취소",
  variant = "default",
  confirmationText,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const [inputValue, setInputValue] = useState("");

  // 모달이 열릴 때 입력값 초기화
  useEffect(() => {
    if (open) {
      setInputValue("");
    }
  }, [open]);

  if (!open) return null;

  const isConfirmDisabled = confirmationText ? inputValue !== confirmationText : false;

  const handleConfirm = () => {
    if (isConfirmDisabled) return;
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-content/50 backdrop-blur-sm p-md" >
      <div className="w-full max-w-sm rounded-modal bg-surface p-xl shadow-card animate-in fade-in zoom-in duration-200" >
        <h3 className="text-Section-Title text-content" >{title}</h3>
        
        {description && (
          <p className="mt-sm text-Body-Primary-KR text-content-secondary whitespace-pre-wrap" >
            {description}
          </p>
        )}

        {children && <div className="mt-sm">{children}</div>}

        {confirmationText && (
          <div className="mt-md" >
            <p className="text-Label text-content-secondary mb-sm" >
              계속하려면 아래에 <span className="text-state-error font-bold italic" >"{confirmationText}"</span>를 입력해 주세요.
            </p>
            <input
              className="w-full rounded-input border-0 bg-surface-secondary px-md py-sm text-Body-Primary-KR focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all" type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder={`"${confirmationText}" 입력`} onKeyDown={(e) => {
                if (e.key === "Enter" && !isConfirmDisabled) {
                  handleConfirm();
                }
              }} autoFocus={true}/>
          </div>
        )}

        <div className="mt-xl flex justify-end gap-sm" >
          <button 
            className="rounded-button border border-line px-md py-sm text-Label text-content-secondary hover:bg-surface-secondary transition-colors" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={cn(
              "rounded-button px-md py-sm text-Label text-white transition-all",
              isConfirmDisabled
                ? "bg-surface-tertiary cursor-not-allowed opacity-50"
                : variant === "danger" 
                  ? "bg-error hover:scale-[1.02] active:scale-[0.98]" 
                  : "bg-primary hover:scale-[1.02] active:scale-[0.98]"
            )} disabled={isConfirmDisabled} onClick={handleConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect } from "react";
import { Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InlineEditOption {
  value: string;
  label: string;
}

export interface InlineEditProps {
  value: string | number;
  onChange: (value: string) => void;
  type?: "text" | "number" | "select";
  options?: InlineEditOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function InlineEdit({
  value,
  onChange,
  type = "text",
  options,
  placeholder = "입력하세요",
  className,
  disabled = false,
}: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  // value 외부 변경 동기화
  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  const startEdit = () => {
    if (disabled) return;
    setDraft(String(value));
    setEditing(true);
  };

  const handleConfirm = () => {
    onChange(draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(String(value));
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirm();
    }
    if (e.key === "Escape") {
      handleCancel();
    }
  };

  useEffect(() => {
    if (editing) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
        selectRef.current?.focus();
      }, 0);
    }
  }, [editing]);

  const displayValue =
    type === "select"
      ? options?.find((o) => o.value === String(value))?.label ?? String(value)
      : String(value);

  if (editing) {
    return (
      <span className={cn("inline-flex items-center gap-1", className)}>
        {type === "select" ? (
          <select
            ref={selectRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-7 px-sm bg-surface-secondary rounded border border-primary text-[13px] text-content focus:ring-1 focus:ring-primary/20 outline-none"
          >
            {options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            ref={inputRef}
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="h-7 px-sm bg-surface-secondary rounded border border-primary text-[13px] text-content focus:ring-1 focus:ring-primary/20 outline-none min-w-0 w-32"
          />
        )}
        <button
          type="button"
          onClick={handleConfirm}
          className="h-6 w-6 flex items-center justify-center rounded text-green-600 hover:bg-green-50 transition-colors"
          aria-label="저장"
        >
          <Check size={13} />
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="h-6 w-6 flex items-center justify-center rounded text-red-400 hover:bg-red-50 transition-colors"
          aria-label="취소"
        >
          <X size={13} />
        </button>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 group",
        !disabled && "cursor-pointer",
        className
      )}
      onClick={startEdit}
      role={disabled ? undefined : "button"}
      tabIndex={disabled ? undefined : 0}
      onKeyDown={
        disabled
          ? undefined
          : (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                startEdit();
              }
            }
      }
    >
      <span className="text-[13px] text-content">
        {displayValue || (
          <span className="text-content-tertiary">{placeholder}</span>
        )}
      </span>
      {!disabled && (
        <Pencil
          size={12}
          className="text-content-tertiary opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        />
      )}
    </span>
  );
}

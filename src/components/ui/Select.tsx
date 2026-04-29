import React, { useId, useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  /** 옵션 목록 */
  options: SelectOption[];
  /** 선택된 값 */
  value?: string;
  /** 변경 핸들러 */
  onChange?: (value: string) => void;
  /** 레이블 텍스트 */
  label?: string;
  /** 플레이스홀더 */
  placeholder?: string;
  /** 에러 메시지 */
  error?: string;
  /** 힌트 텍스트 */
  hint?: string;
  /** 검색 가능 여부 */
  searchable?: boolean;
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 추가 클래스 */
  className?: string;
  /** ID */
  id?: string;
}

export default function Select({
  options,
  value,
  onChange,
  label,
  placeholder = "선택하세요",
  error,
  hint,
  searchable = false,
  disabled = false,
  className,
  id: propId,
}: SelectProps) {
  const generatedId = useId();
  const id = propId ?? generatedId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const listboxId = `${id}-listbox`;

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const filteredOptions = searchable && search
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  // 외부 클릭 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 열릴 때 검색 인풋 포커스
  useEffect(() => {
    if (open && searchable) {
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open, searchable]);

  const handleToggle = () => {
    if (!disabled) {
      setOpen((prev) => !prev);
      setSearch("");
    }
  };

  const handleSelect = (option: SelectOption) => {
    if (option.disabled) return;
    onChange?.(option.value);
    setOpen(false);
    setSearch("");
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      setSearch("");
      triggerRef.current?.focus();
    }
    if (e.key === "Enter" || e.key === " ") {
      if (!open) {
        e.preventDefault();
        setOpen(true);
      }
    }
    if (e.key === "ArrowDown" && !open) {
      e.preventDefault();
      setOpen(true);
    }
  };

  const describedBy = [
    error ? errorId : null,
    hint && !error ? hintId : null,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div ref={containerRef} className={cn("relative flex flex-col gap-xs w-full", className)}>
      {label && (
        <label
          htmlFor={id}
          className="text-[12px] font-medium text-content-secondary"
        >
          {label}
        </label>
      )}

      {/* 트리거 버튼 */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        onKeyDown={handleKeyDown}
        onClick={handleToggle}
        className={cn(
          "app-control flex h-[44px] w-full items-center justify-between gap-xs rounded-2xl px-md text-[13px] border transition-all duration-150 outline-none",
          "focus-visible:ring-2 focus-visible:ring-primary/10",
          error
            ? "border-red-400 focus-visible:border-red-400"
            : open
            ? "border-primary ring-2 ring-primary/10"
            : "border-line/80 hover:border-primary/50",
          disabled && "cursor-not-allowed opacity-50 bg-surface-tertiary"
        )}
      >
        <span className={cn("truncate text-left", !selectedOption && "text-content-tertiary")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            "shrink-0 text-content-tertiary transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      {/* 드롭다운 */}
      {open && (
        <div
          className={cn(
            "absolute z-50 mt-2 w-full min-w-[160px] rounded-2xl border border-line/80 bg-white/95 shadow-card-deep backdrop-blur-xl",
            "animate-in fade-in zoom-in-95 duration-100"
          )}
          style={{ top: "100%", left: 0 }}
        >
          {/* 검색 인풋 */}
          {searchable && (
            <div className="px-sm pt-sm pb-xs border-b border-line">
              <div className="relative flex items-center">
                <Search size={13} className="absolute left-sm text-content-tertiary pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="검색..."
                  className="app-control h-8 w-full rounded-xl pl-7 pr-sm text-[12px] text-content focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setOpen(false);
                      setSearch("");
                      triggerRef.current?.focus();
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* 옵션 목록 */}
          <ul
            id={listboxId}
            role="listbox"
            aria-label={label}
            className="py-xs max-h-60 overflow-y-auto"
          >
            {filteredOptions.length === 0 ? (
              <li className="px-md py-sm text-[12px] text-content-tertiary text-center">
                검색 결과 없음
              </li>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled}
                    onClick={() => handleSelect(option)}
                    className={cn(
                      "flex items-center justify-between px-md py-sm text-[13px] transition-colors duration-100",
                      option.disabled
                        ? "cursor-not-allowed opacity-40 text-content-tertiary"
                        : isSelected
                        ? "bg-primary/10 text-primary cursor-pointer"
                        : "text-content cursor-pointer hover:bg-surface-secondary"
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && <Check size={13} className="shrink-0 text-primary" />}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-[11px] text-red-500">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="text-[11px] text-content-tertiary">
          {hint}
        </p>
      )}
    </div>
  );
}

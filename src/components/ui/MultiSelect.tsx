import React, { useId, useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  searchable?: boolean;
  maxItems?: number;
  disabled?: boolean;
  className?: string;
}

export default function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "선택하세요",
  label,
  error,
  searchable = true,
  maxItems,
  disabled = false,
  className,
}: MultiSelectProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const filteredOptions =
    searchable && search
      ? options.filter((o) =>
          o.label.toLowerCase().includes(search.toLowerCase())
        )
      : options;

  const allSelected =
    options.length > 0 && options.every((o) => value.includes(o.value));
  const someSelected = value.length > 0 && !allSelected;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleToggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      if (maxItems && value.length >= maxItems) return;
      onChange([...value, optionValue]);
    }
  };

  const handleToggleAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      const allValues = options.map((o) => o.value);
      if (maxItems) {
        onChange(allValues.slice(0, maxItems));
      } else {
        onChange(allValues);
      }
    }
  };

  const handleRemoveTag = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== optionValue));
  };

  const selectedLabels = value
    .map((v) => options.find((o) => o.value === v)?.label)
    .filter(Boolean) as string[];

  return (
    <div
      ref={containerRef}
      className={cn("relative flex flex-col gap-xs w-full", className)}
    >
      {label && (
        <label
          htmlFor={id}
          className="text-[12px] font-medium text-content-secondary"
        >
          {label}
        </label>
      )}

      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={handleToggle}
        className={cn(
          "w-full min-h-[44px] px-md py-xs flex items-center justify-between gap-xs",
          "bg-surface-secondary rounded-lg text-[13px] border transition-all duration-150 outline-none text-left",
          "focus-visible:ring-1 focus-visible:ring-primary/20",
          error
            ? "border-red-400"
            : open
            ? "border-primary ring-1 ring-primary/20"
            : "border-line hover:border-primary/50",
          disabled && "cursor-not-allowed opacity-50 bg-surface-tertiary"
        )}
      >
        <span className="flex-1 flex flex-wrap gap-1 min-w-0">
          {selectedLabels.length === 0 ? (
            <span className="text-content-tertiary">{placeholder}</span>
          ) : (
            selectedLabels.map((lbl, idx) => (
              <span
                key={value[idx]}
                className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[11px] font-medium"
              >
                {lbl}
                <button
                  type="button"
                  onClick={(e) => handleRemoveTag(value[idx], e)}
                  className="hover:bg-primary/20 rounded-full transition-colors"
                  aria-label={`${lbl} 제거`}
                >
                  <X size={10} />
                </button>
              </span>
            ))
          )}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            "shrink-0 text-content-tertiary transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-50 mt-1 w-full bg-surface rounded-lg border border-line shadow-card-deep",
            "animate-in fade-in zoom-in-95 duration-100"
          )}
          style={{ top: "100%", left: 0 }}
        >
          {searchable && (
            <div className="px-sm pt-sm pb-xs border-b border-line">
              <div className="relative flex items-center">
                <Search
                  size={13}
                  className="absolute left-sm text-content-tertiary pointer-events-none"
                />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="검색..."
                  className="w-full h-8 pl-7 pr-sm bg-surface-secondary rounded text-[12px] text-content border border-line focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setOpen(false);
                      setSearch("");
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* 전체 선택/해제 */}
          {!search && (
            <div className="px-md py-xs border-b border-line">
              <button
                type="button"
                onClick={handleToggleAll}
                className="flex items-center gap-xs text-[12px] text-content-secondary hover:text-content transition-colors"
              >
                <span
                  className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                    allSelected
                      ? "bg-primary border-primary"
                      : someSelected
                      ? "bg-primary/30 border-primary/50"
                      : "border-line"
                  )}
                >
                  {(allSelected || someSelected) && (
                    <Check size={10} className="text-white" />
                  )}
                </span>
                {allSelected ? "전체 해제" : "전체 선택"}
              </button>
            </div>
          )}

          <ul
            role="listbox"
            aria-multiselectable="true"
            className="py-xs max-h-56 overflow-y-auto"
          >
            {filteredOptions.length === 0 ? (
              <li className="px-md py-sm text-[12px] text-content-tertiary text-center">
                결과 없음
              </li>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = value.includes(option.value);
                const isDisabled =
                  !isSelected && !!maxItems && value.length >= maxItems;
                return (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => !isDisabled && handleToggleOption(option.value)}
                    className={cn(
                      "flex items-center gap-xs px-md py-sm text-[13px] transition-colors duration-100",
                      isDisabled
                        ? "cursor-not-allowed opacity-40 text-content-tertiary"
                        : "cursor-pointer hover:bg-surface-secondary text-content"
                    )}
                  >
                    <span
                      className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                        isSelected
                          ? "bg-primary border-primary"
                          : "border-line"
                      )}
                    >
                      {isSelected && (
                        <Check size={10} className="text-white" />
                      )}
                    </span>
                    <span className="truncate">{option.label}</span>
                  </li>
                );
              })
            )}
          </ul>

          {maxItems && (
            <div className="px-md py-xs border-t border-line text-[11px] text-content-tertiary">
              {value.length}/{maxItems} 선택됨
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-[11px] text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

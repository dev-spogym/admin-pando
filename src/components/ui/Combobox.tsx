import React, { useId, useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange?: (value: string) => void;
  searchable?: boolean;
  creatable?: boolean;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export default function Combobox({
  options,
  value,
  onChange,
  searchable = true,
  creatable = false,
  placeholder = "선택하세요",
  label,
  error,
  disabled = false,
  className,
}: ComboboxProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const filteredOptions =
    searchable && search
      ? options.filter((o) =>
          o.label.toLowerCase().includes(search.toLowerCase())
        )
      : options;

  const showCreatable =
    creatable &&
    search.trim() !== "" &&
    !options.some(
      (o) => o.label.toLowerCase() === search.trim().toLowerCase()
    );

  const allItems = showCreatable
    ? [...filteredOptions, { value: `__create__:${search}`, label: search, description: undefined }]
    : filteredOptions;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && searchable) {
      setTimeout(() => searchRef.current?.focus(), 0);
    }
    if (!open) setActiveIndex(-1);
  }, [open, searchable]);

  // 활성 항목 스크롤
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  const handleToggle = () => {
    if (!disabled) {
      setOpen((prev) => !prev);
      setSearch("");
    }
  };

  const handleSelect = (item: ComboboxOption) => {
    if (item.value.startsWith("__create__:")) {
      const newValue = item.value.replace("__create__:", "");
      onChange?.(newValue);
    } else {
      onChange?.(item.value);
    }
    setOpen(false);
    setSearch("");
    setActiveIndex(-1);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      setSearch("");
      setActiveIndex(-1);
      triggerRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, allItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(allItems[activeIndex]);
    }
  };

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
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full h-[44px] px-md flex items-center justify-between gap-xs",
          "bg-surface-secondary rounded-lg text-[13px] border transition-all duration-150 outline-none",
          "focus-visible:ring-1 focus-visible:ring-primary/20",
          error
            ? "border-red-400 focus-visible:border-red-400"
            : open
            ? "border-primary ring-1 ring-primary/20"
            : "border-line hover:border-primary/50",
          disabled && "cursor-not-allowed opacity-50 bg-surface-tertiary"
        )}
      >
        <span
          className={cn(
            "truncate text-left",
            !selectedOption && "text-content-tertiary"
          )}
        >
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

      {open && (
        <div
          className={cn(
            "absolute z-50 mt-1 w-full bg-surface rounded-lg border border-line shadow-card-deep",
            "animate-in fade-in zoom-in-95 duration-100"
          )}
          style={{ top: "100%", left: 0 }}
          onKeyDown={handleKeyDown}
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
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setActiveIndex(-1);
                  }}
                  placeholder="검색..."
                  className="w-full h-8 pl-7 pr-sm bg-surface-secondary rounded text-[12px] text-content border border-line focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
                />
              </div>
            </div>
          )}

          <ul
            ref={listRef}
            role="listbox"
            className="py-xs max-h-60 overflow-y-auto"
          >
            {filteredOptions.length === 0 && !showCreatable ? (
              <li className="px-md py-sm text-[12px] text-content-tertiary text-center">
                결과 없음
              </li>
            ) : (
              <>
                {filteredOptions.map((option, idx) => {
                  const isSelected = option.value === value;
                  const isActive = idx === activeIndex;
                  return (
                    <li
                      key={option.value}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(option)}
                      className={cn(
                        "flex items-start justify-between px-md py-sm text-[13px] cursor-pointer transition-colors duration-100",
                        isActive
                          ? "bg-surface-secondary"
                          : isSelected
                          ? "bg-primary/10 text-primary"
                          : "text-content hover:bg-surface-secondary"
                      )}
                    >
                      <span className="flex flex-col gap-0.5">
                        <span className="truncate">{option.label}</span>
                        {option.description && (
                          <span className="text-[11px] text-content-tertiary">
                            {option.description}
                          </span>
                        )}
                      </span>
                      {isSelected && (
                        <Check size={13} className="shrink-0 text-primary mt-0.5" />
                      )}
                    </li>
                  );
                })}
                {showCreatable && (
                  <li
                    role="option"
                    onClick={() =>
                      handleSelect({
                        value: `__create__:${search}`,
                        label: search,
                      })
                    }
                    className={cn(
                      "flex items-center gap-xs px-md py-sm text-[13px] cursor-pointer transition-colors duration-100 text-primary",
                      activeIndex === filteredOptions.length
                        ? "bg-surface-secondary"
                        : "hover:bg-surface-secondary"
                    )}
                  >
                    <Plus size={13} className="shrink-0" />
                    <span>
                      &ldquo;{search}&rdquo; 새로 추가
                    </span>
                  </li>
                )}
              </>
            )}
          </ul>
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

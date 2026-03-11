import React, { useRef, useState, useId } from "react";
import { Upload, X, File } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FileUploadProps {
  /** 허용 파일 확장자 (예: "image/*,.pdf") */
  accept?: string;
  /** 최대 파일 크기 (MB 단위) */
  maxSize?: number;
  /** 파일 선택 핸들러 */
  onFileSelect: (file: File | null) => void;
  /** 이미지 미리보기 여부 (accept에 image 포함 시 자동 활성화) */
  preview?: boolean;
  /** 레이블 텍스트 */
  label?: string;
  /** 추가 클래스 */
  className?: string;
}

export default function FileUpload({
  accept,
  maxSize,
  onFileSelect,
  preview,
  label,
  className,
}: FileUploadProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // accept에 image가 포함되어 있으면 미리보기 활성화
  const showPreview = preview ?? (accept?.includes("image") ?? false);

  // 허용 형식 레이블 생성
  const acceptLabel = accept
    ? accept
        .split(",")
        .map((s) => s.trim().replace("image/", "").replace("*", "모든 이미지"))
        .join(", ")
    : "모든 파일";

  const processFile = (file: File) => {
    setError(null);

    // 파일 크기 검증
    if (maxSize !== undefined && file.size > maxSize * 1024 * 1024) {
      setError(`파일 크기가 ${maxSize}MB를 초과할 수 없습니다. (현재: ${(file.size / 1024 / 1024).toFixed(1)}MB)`);
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);

    // 이미지 미리보기 생성
    if (showPreview && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) processFile(file);
    // input 초기화 (같은 파일 재선택 가능하도록)
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleRemove = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    onFileSelect(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  };

  return (
    <div className={cn("flex flex-col gap-xs", className)}>
      {/* 레이블 */}
      {label && (
        <label htmlFor={id} className="text-Label font-medium text-4">
          {label}
        </label>
      )}

      {/* 드래그앤드롭 영역 */}
      {!selectedFile && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "flex flex-col items-center justify-center gap-sm rounded-card-normal border-2 border-dashed p-xl",
            "transition-colors duration-150 cursor-pointer",
            isDragging
              ? "border-0 bg-6"
              : "border-7 bg-9 hover:border-5 hover:bg-2"
          )}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") inputRef.current?.click();
          }}
          aria-label="파일 업로드 영역"
        >
          <Upload
            size={28}
            className={cn(isDragging ? "text-0" : "text-5")}
          />
          <div className="text-center">
            <p className="text-Body-Primary-KR text-4">
              파일을 드래그하거나{" "}
              <span className="font-semibold text-0 underline underline-offset-2">
                클릭하여 선택
              </span>
            </p>
            <p className="mt-xs text-[11px] text-5">
              허용 형식: {acceptLabel}
              {maxSize !== undefined && ` · 최대 ${maxSize}MB`}
            </p>
          </div>
        </div>
      )}

      {/* 선택된 파일 표시 */}
      {selectedFile && (
        <div className="rounded-card-normal border border-7 bg-3 p-md">
          {/* 이미지 미리보기 */}
          {previewUrl && (
            <div className="mb-sm overflow-hidden rounded-1">
              <img
                src={previewUrl}
                alt="미리보기"
                className="max-h-48 w-full object-contain bg-2"
              />
            </div>
          )}

          {/* 파일 정보 */}
          <div className="flex items-center gap-sm">
            <File size={18} className="flex-shrink-0 text-5" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-Body-Primary-KR text-4 font-medium">
                {selectedFile.name}
              </p>
              <p className="text-[11px] text-5">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            {/* 제거 버튼 */}
            <button
              type="button"
              onClick={handleRemove}
              className="flex-shrink-0 rounded-button p-xs text-5 transition-colors hover:bg-2 hover:text-error"
              aria-label="파일 제거"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <p className="text-[11px] font-medium text-error">{error}</p>
      )}

      {/* 숨겨진 file input */}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

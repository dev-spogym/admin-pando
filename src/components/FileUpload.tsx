import React, { useRef, useState, useId } from "react";
import { Upload, X, File, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FileUploadProps {
  /** 허용 파일 확장자 (예: "image/*,.pdf") */
  accept?: string;
  /** 최대 파일 크기 (MB 단위) */
  maxSize?: number;
  /** 파일 선택 핸들러 */
  onFileSelect: (file: File | null) => void;
  /** Supabase Storage 업로드 핸들러. 제공 시 파일 선택 후 자동 업로드. 업로드된 URL 반환, 실패 시 null */
  onUpload?: (file: File) => Promise<string | null>;
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
  onUpload,
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
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  // accept에 image가 포함되어 있으면 미리보기 활성화
  const showPreview = preview ?? (accept?.includes("image") ?? false);

  // 허용 형식 레이블 생성
  const acceptLabel = accept
    ? accept
        .split(",")
        .map((s) => s.trim().replace("image/", "").replace("*", "모든 이미지"))
        .join(", ")
    : "모든 파일";

  const processFile = async (file: File) => {
    setError(null);
    setUploadedUrl(null);

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

    // Supabase Storage 업로드 (onUpload 제공 시)
    if (onUpload) {
      setUploading(true);
      try {
        const url = await onUpload(file);
        if (url) {
          setUploadedUrl(url);
        } else {
          setError('업로드에 실패했습니다. 다시 시도해주세요.');
        }
      } catch {
        setError('업로드 중 오류가 발생했습니다.');
      } finally {
        setUploading(false);
      }
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
    setUploadedUrl(null);
    setUploading(false);
    onFileSelect(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  };

  return (
    <div className={cn("flex flex-col gap-xs", className)}>
      {/* 레이블 */}
      {label && (
        <label htmlFor={id} className="text-Label font-medium text-content">
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
            "flex flex-col items-center justify-center gap-sm rounded-xl border-2 border-dashed p-xl",
            "transition-colors duration-150 cursor-pointer",
            isDragging
              ? "border-0 bg-primary-light"
              : "border-line bg-surface-secondary hover:border-5 hover:bg-surface-secondary"
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
            className={cn(isDragging ? "text-primary" : "text-content-secondary")}
          />
          <div className="text-center">
            <p className="text-Body-Primary-KR text-content">
              파일을 드래그하거나{" "}
              <span className="font-semibold text-primary underline underline-offset-2">
                클릭하여 선택
              </span>
            </p>
            <p className="mt-xs text-[11px] text-content-secondary">
              허용 형식: {acceptLabel}
              {maxSize !== undefined && ` · 최대 ${maxSize}MB`}
            </p>
          </div>
        </div>
      )}

      {/* 선택된 파일 표시 */}
      {selectedFile && (
        <div className="rounded-xl border border-line bg-surface p-md">
          {/* 이미지 미리보기 */}
          {previewUrl && (
            <div className="mb-sm overflow-hidden rounded-1">
              <img
                src={previewUrl}
                alt="미리보기"
                className="max-h-48 w-full object-contain bg-surface-secondary"
              />
            </div>
          )}

          {/* 파일 정보 */}
          <div className="flex items-center gap-sm">
            <File size={18} className="flex-shrink-0 text-content-secondary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-Body-Primary-KR text-content font-medium">
                {selectedFile.name}
              </p>
              <p className="text-[11px] text-content-secondary">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            {/* 업로드 상태 표시 */}
            {uploading && (
              <Loader2 size={16} className="flex-shrink-0 text-primary animate-spin" aria-label="업로드 중" />
            )}
            {!uploading && uploadedUrl && (
              <CheckCircle2 size={16} className="flex-shrink-0 text-state-success" aria-label="업로드 완료" />
            )}
            {/* 제거 버튼 */}
            <button
              type="button"
              onClick={handleRemove}
              className="flex-shrink-0 rounded-button p-xs text-content-secondary transition-colors hover:bg-surface-secondary hover:text-state-error"
              aria-label="파일 제거"
            >
              <X size={16} />
            </button>
          </div>
          {/* 업로드 완료 메시지 */}
          {!uploading && uploadedUrl && (
            <p className="mt-xs text-[11px] text-state-success font-medium">업로드 완료</p>
          )}
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <p className="text-[11px] font-medium text-state-error">{error}</p>
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

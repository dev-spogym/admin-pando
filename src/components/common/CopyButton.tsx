import React, { useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CopyButtonProps {
  text: string;
  className?: string;
}

export default function CopyButton({ text, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 API 미지원 폴백
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "복사됨" : "클립보드에 복사"}
      className={cn(
        "inline-flex items-center justify-center w-6 h-6 rounded-md",
        "text-content-secondary hover:text-content hover:bg-surface-secondary",
        "transition-colors duration-150 shrink-0",
        className
      )}
    >
      {copied ? (
        <Check size={13} className="text-green-500" />
      ) : (
        <Copy size={13} />
      )}
    </button>
  );
}

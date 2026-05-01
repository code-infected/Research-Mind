"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorDisplayProps {
  error: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorDisplay({ error, onRetry, onDismiss }: ErrorDisplayProps) {
  return (
    <div className="max-w-[720px] mx-auto px-4 mb-6">
      <div className="border border-[#E34234]/30 bg-[#E34234]/5 p-4">
        <div className="flex items-start gap-3 mb-3">
          <AlertTriangle className="w-4 h-4 text-[#E34234] mt-0.5" />
          <div className="flex-1">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#E34234] mb-1">
              Research Failed
            </p>
            <p className="font-mono text-[13px] text-[#8A8A8A]">{error}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 ml-7">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-[#E34234] hover:text-[#ff5a4a] transition-colors border border-[#E34234]/30 px-3 py-1.5"
            >
              <RefreshCw className="w-3 h-3" />
              RETRY
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#484848] hover:text-[#8A8A8A] transition-colors px-3 py-1.5"
            >
              DISMISS
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

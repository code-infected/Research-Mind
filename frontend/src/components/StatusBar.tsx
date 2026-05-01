"use client";

interface StatusBarProps {
  isActive: boolean;
  currentQuestion: number;
  totalQuestions: number;
  elapsedTime: string;
  onAbort?: () => void;
}

export function StatusBar({ isActive, currentQuestion, totalQuestions, elapsedTime, onAbort }: StatusBarProps) {
  if (!isActive) return null;

  const progress = totalQuestions > 0 ? Math.round((currentQuestion / totalQuestions) * 100) : 0;
  const filledBlocks = Math.round((progress / 100) * 12);
  const progressBar = "█".repeat(filledBlocks) + "░".repeat(12 - filledBlocks);

  return (
    <div className="fixed top-12 left-0 right-0 z-30 bg-[#080808] border-b border-[rgba(255,255,255,0.04)]">
      <div className="flex items-center justify-between px-4 h-10">
        {/* Left: Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-[#00D9FF] timeline-pulse" />
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#00D9FF]">
              LIVE
            </span>
          </div>
          
          <span className="font-mono text-[11px] text-[#484848]">
            RESEARCHING Q{currentQuestion} OF {totalQuestions}
          </span>
        </div>

        {/* Center: Progress */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-[#00D9FF]">
            {progressBar}
          </span>
          <span className="font-mono text-[11px] text-[#8A8A8A] w-8">
            {progress}%
          </span>
        </div>

        {/* Right: Timer & Abort */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-[#8A8A8A]">
            {elapsedTime}
          </span>
          
          {onAbort && (
            <button
              onClick={onAbort}
              className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#E34234] hover:text-[#ff5a4a] transition-colors"
            >
              [ABORT]
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

interface TerminalInputProps {
  onSubmit: (topic: string, context: string, maxQuestions: number, includeArxiv: boolean) => void;
  isResearching: boolean;
  initialTopic?: string;
}

export function TerminalInput({ onSubmit, isResearching, initialTopic = "" }: TerminalInputProps) {
  const [topic, setTopic] = useState(initialTopic);
  const [context, setContext] = useState("");
  const [maxQuestions, setMaxQuestions] = useState(5);
  const [includeArxiv, setIncludeArxiv] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = () => {
    if (!topic.trim() || isResearching) return;
    onSubmit(topic.trim(), context.trim(), maxQuestions, includeArxiv);
  };

  const charCount = topic.length;
  const maxChars = 500;

  return (
    <div className="max-w-[720px] mx-auto w-full px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-[28px] font-bold text-[#F8F8F8] tracking-tight mb-2">
          What do you need to know?
        </h1>
        <p className="font-mono text-[13px] text-[#484848]">
          Autonomous research agent. Terminal-precision intelligence.
        </p>
      </div>

      {/* Main Input */}
      <div className="mb-6">
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="e.g., Current research gaps in climate-resilient agriculture..."
          disabled={isResearching}
          rows={4}
          className="w-full bg-[#0F0F0F] border border-[rgba(255,255,255,0.08)] text-[#F8F8F8] font-mono text-[14px] p-4 resize-none focus:outline-none focus:border-[#00D9FF] transition-colors placeholder:text-[#484848]"
        />
        <div className="flex justify-end mt-1">
          <span className={`font-mono text-[11px] ${charCount > maxChars ? 'text-[#E34234]' : 'text-[#484848]'}`}>
            {charCount}/{maxChars}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-6 space-y-4">
        {/* Depth Slider */}
        <div className="flex items-center gap-4">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#8A8A8A] w-16">
            DEPTH
          </span>
          <div className="flex-1 flex items-center gap-4">
            <input
              type="range"
              min={1}
              max={10}
              value={maxQuestions}
              onChange={(e) => setMaxQuestions(Number(e.target.value))}
              className="flex-1 h-px bg-[#484848] appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #00D9FF 0%, #00D9FF ${(maxQuestions - 1) / 9 * 100}%, #484848 ${(maxQuestions - 1) / 9 * 100}%, #484848 100%)`
              }}
            />
            <span className="font-mono text-[13px] text-[#F8F8F8] w-28">
              {maxQuestions} QUESTIONS
            </span>
          </div>
        </div>

        {/* Checkboxes */}
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeArxiv}
              onChange={(e) => setIncludeArxiv(e.target.checked)}
              className="w-3 h-3 border border-[#484848] bg-transparent checked:bg-[#00D9FF] checked:border-[#00D9FF]"
            />
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#8A8A8A]">
              INCLUDE ARXIV
            </span>
          </label>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#484848] hover:text-[#8A8A8A] transition-colors"
          >
            {showAdvanced ? "[-] ADVANCED" : "[+] ADVANCED"}
          </button>
        </div>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="border-t border-[rgba(255,255,255,0.04)] pt-4">
            <div className="mb-2">
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#484848]">
                CONTEXT
              </span>
            </div>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Add constraints or focus areas..."
              rows={2}
              className="w-full bg-[#0F0F0F] border border-[rgba(255,255,255,0.08)] text-[#F8F8F8] font-mono text-[13px] p-3 resize-none focus:outline-none focus:border-[#00D9FF] transition-colors placeholder:text-[#484848]"
            />
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!topic.trim() || isResearching}
        className="w-full bg-[#00D9FF] text-[#020202] font-mono text-[13px] font-semibold uppercase tracking-[0.05em] py-3 px-4 flex items-center justify-center gap-2 hover:bg-[#00C4E8] active:scale-[0.995] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus className="w-4 h-4" />
        INITIATE RESEARCH →
      </button>
    </div>
  );
}

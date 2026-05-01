"use client";

import { useCallback } from "react";
import { Download, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ReportMetadata {
  topic?: string;
  word_count?: number;
  sources_cited?: number;
  questions_researched?: number;
  findings_used?: number;
  duration_seconds?: number;
  char_count?: number;
  bibliography?: Array<{
    number: number;
    title: string;
    url: string;
    source?: string;
    source_type?: string;
  }>;
}

interface ReportViewProps {
  content: string;
  metadata?: ReportMetadata;
}

export function ReportView({ content, metadata }: ReportViewProps) {
  // Format duration from seconds
  const formatDuration = (seconds?: number) => {
    if (!seconds) return "--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  // Export report as markdown file
  const handleExportMd = useCallback(() => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `research-${(metadata?.topic || "report").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [content, metadata?.topic]);

  return (
    <div className="max-w-[800px] mx-auto">
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-[rgba(255,255,255,0.04)]">
        <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#484848] mb-2">
          REPORT
        </div>
        
        <h1 className="font-display text-[20px] font-bold text-[#F8F8F8] tracking-tight mb-4 leading-tight">
          {metadata?.topic || "Research Report"}
        </h1>
        
        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
          <span className="font-mono text-[11px] text-[#8A8A8A]">
            <span className="text-[#F8F8F8]">{metadata?.sources_cited || 0}</span> SOURCES
          </span>
          <span className="font-mono text-[11px] text-[#484848]">|</span>
          <span className="font-mono text-[11px] text-[#8A8A8A]">
            <span className="text-[#F8F8F8]">{(metadata?.word_count || 0).toLocaleString()}</span> WORDS
          </span>
          <span className="font-mono text-[11px] text-[#484848]">|</span>
          <span className="font-mono text-[11px] text-[#8A8A8A]">
            <span className="text-[#F8F8F8]">{formatDuration(metadata?.duration_seconds)}</span>
          </span>
          <span className="font-mono text-[11px] text-[#484848]">|</span>
          <span className="font-mono text-[11px] text-[#8A8A8A]">
            <span className="text-[#F8F8F8]">{metadata?.questions_researched || 0}</span> QUESTIONS
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportMd}
            className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-[#8A8A8A] hover:text-[#00D9FF] transition-colors px-3 py-1.5 border border-[rgba(255,255,255,0.08)]"
          >
            <FileText className="w-3 h-3" />
            EXPORT MD
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(content).then(() => {
                // Brief feedback would be nice — but keeping it simple
              }).catch(() => {});
            }}
            className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-[#8A8A8A] hover:text-[#00D9FF] transition-colors px-3 py-1.5 border border-[rgba(255,255,255,0.08)]"
          >
            <Download className="w-3 h-3" />
            COPY MD
          </button>
        </div>
      </div>

      {/* Report Content — rendered with react-markdown */}
      <div className="report-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Map heading levels to proper classes
            h1: ({ children }) => <h1>{children}</h1>,
            h2: ({ children }) => <h2>{children}</h2>,
            h3: ({ children }) => <h3>{children}</h3>,
            // Style links as cyan
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>

      {/* Bibliography */}
      <div className="mt-12 pt-6 border-t border-[rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-2 mb-4">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#8A8A8A]">
            BIBLIOGRAPHY
          </span>
          <div className="flex-1 h-px bg-[rgba(255,255,255,0.04)]" />
          <span className="font-mono text-[11px] text-[#484848]">
            {metadata?.sources_cited || 0}
          </span>
        </div>
        
        <div className="space-y-2">
          {metadata?.bibliography && metadata.bibliography.length > 0 ? (
            metadata.bibliography.map((entry, idx) => (
              <div key={idx} className="font-mono text-[12px] text-[#8A8A8A]">
                <span className="text-[#00D9FF]">[{entry.number}]</span>{" "}
                <a href={entry.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#00D9FF] transition-colors">
                  {entry.title}
                </a>
                {" "}<span className="text-[#484848]">— {entry.source || entry.source_type || "source"}</span>
              </div>
            ))
          ) : (
            <div className="font-mono text-[12px] text-[#484848]">
              No bibliography available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";

interface ReportProps {
  content: string;
  metadata?: {
    topic?: string;
    word_count?: number;
    sources_cited?: number;
    questions_researched?: number;
    findings_used?: number;
  };
}

export default function ResearchReport({ content, metadata }: ReportProps) {
  if (!content) return null;

  const handleExport = () => {
    window.print();
  };

  return (
    <div className="bg-[#020202] shadow-glass border border-white/5 rounded-3xl p-8 md:p-12 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary-glow rounded-full blur-[140px] opacity-10 pointer-events-none" />
      
      {/* Report Header */}
      <div className="flex justify-between items-start mb-10 flex-wrap gap-4 relative z-10">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span className="bg-primary/10 text-xl p-2 rounded-xl border border-primary/20 shadow-[0_0_15px_rgba(139,92,246,0.2)]">📝</span> Research Report
          </h2>
          {metadata && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex gap-4 mt-4 flex-wrap"
            >
              {metadata.word_count && (
                <span className="text-[12.5px] font-medium text-zinc-400 bg-white/5 px-2.5 py-1 rounded-md border border-white/5 flex items-center gap-1.5">
                  <span className="text-zinc-500">Words</span> {metadata.word_count.toLocaleString()}
                </span>
              )}
              {metadata.sources_cited !== undefined && (
                <span className="text-[12.5px] font-medium text-zinc-400 bg-white/5 px-2.5 py-1 rounded-md border border-white/5 flex items-center gap-1.5">
                  <span className="text-zinc-500">Sources</span> {metadata.sources_cited}
                </span>
              )}
              {metadata.questions_researched && (
                <span className="text-[12.5px] font-medium text-zinc-400 bg-white/5 px-2.5 py-1 rounded-md border border-white/5 flex items-center gap-1.5">
                  <span className="text-zinc-500">Questions</span> {metadata.questions_researched}
                </span>
              )}
            </motion.div>
          )}
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-zinc-300 text-sm font-medium hover:bg-white/10 hover:border-white/20 hover:text-white transition-all duration-300 flex items-center gap-2"
        >
          📄 Export PDF
        </button>
      </div>

      {/* Report Content */}
      <div className="report-content relative z-10 text-white/90 selection:bg-primary/30 selection:text-white">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

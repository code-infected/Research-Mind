"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AgentThinking from "@/components/AgentThinking";
import ResearchReport from "@/components/ResearchReport";
import SourcePanel from "@/components/SourcePanel";

interface AgentEvent {
  type: string;
  [key: string]: unknown;
}

interface ReportMetadata {
  topic?: string;
  word_count?: number;
  sources_cited?: number;
  questions_researched?: number;
  findings_used?: number;
}

export default function Dashboard() {
  const [topic, setTopic] = useState("");
  const [isResearching, setIsResearching] = useState(false);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [report, setReport] = useState("");
  const [metadata, setMetadata] = useState<ReportMetadata | null>(null);
  const [sources, setSources] = useState<{ url: string; title: string; excerpt?: string; source_type?: string }[]>([]);
  const [error, setError] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const startResearch = async () => {
    if (!topic.trim() || isResearching) return;

    setIsResearching(true);
    setEvents([]);
    setReport("");
    setMetadata(null);
    setSources([]);
    setError("");

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error("Research request failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));
              setEvents((prev) => [...prev, event]);

              if (event.type === "report" && event.report) {
                setReport(event.report);
                setMetadata(event.metadata || null);
              }
              if (event.type === "finding" && event.url) {
                setSources((prev) => [
                  ...prev,
                  {
                    url: event.url,
                    title: event.title || "",
                    excerpt: event.content?.slice(0, 200) || "",
                    source_type: event.source_type || "web",
                  },
                ]);
              }
              if (event.type === "error") {
                setError(event.error || "An error occurred");
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message || "Research failed");
      }
    } finally {
      setIsResearching(false);
    }
  };

  const stopResearch = () => {
    abortControllerRef.current?.abort();
    setIsResearching(false);
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center mb-10 mt-12"
      >
        <h1 className="text-white text-4xl md:text-5xl font-extrabold tracking-tight mb-4" style={{ letterSpacing: "-0.03em" }}>
          Research Anything
        </h1>
        <p className="text-zinc-400 text-[15px] md:text-base max-w-xl mx-auto leading-relaxed">
          Enter a topic and watch the autonomous AI agent search, read, and synthesize a comprehensive cited report in real time.
        </p>
      </motion.div>

      {/* Search Input */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
        className="max-w-3xl mx-auto mb-10 flex flex-col sm:flex-row gap-3 w-full"
      >
        <div className="flex-1 relative group">
          <div className="absolute inset-0 bg-primary-glow blur-xl opacity-0 group-focus-within:opacity-20 transition-opacity duration-700 pointer-events-none rounded-2xl" />
          <input
            id="research-topic-input"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && startResearch()}
            placeholder="e.g. Latest advances in quantum computing..."
            disabled={isResearching}
            className="w-full px-5 py-4 rounded-xl border border-white/5 bg-black text-gray-100 text-[15px] focus:outline-none focus:border-primary/50 focus:bg-[#050505] transition-all duration-300 placeholder:text-zinc-600 shadow-glass relative z-10"
          />
        </div>
        {isResearching ? (
          <button
            id="stop-research-btn"
            onClick={stopResearch}
            className="px-8 py-4 rounded-xl border border-red-900/50 bg-[#0a0000] text-red-400 text-[15px] font-medium hover:bg-[#140000] hover:border-red-800 transition-all whitespace-nowrap shadow-glass"
          >
            ⏹ Stop
          </button>
        ) : (
          <button
            id="start-research-btn"
            onClick={startResearch}
            disabled={!topic.trim()}
            className="px-8 py-4 rounded-xl bg-primary hover:bg-violet-500 text-white text-[15px] font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.15)] hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] relative z-10"
          >
            🔬 Research
          </button>
        )}
      </motion.div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: "auto", scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            className="max-w-3xl mx-auto mb-6 w-full"
          >
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-3">
              <span>⚠️</span> {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content — two columns */}
      <AnimatePresence>
        {(events.length > 0 || isResearching) && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 min-h-[500px] mb-10 relative z-10"
          >
            <AgentThinking isActive={isResearching} events={events} />
            <div>
              <SourcePanel sources={sources} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report */}
      <AnimatePresence>
        {report && (
          <motion.div 
            id="report-section" 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="mt-6 relative z-10"
          >
            <ResearchReport content={report} metadata={metadata || undefined} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

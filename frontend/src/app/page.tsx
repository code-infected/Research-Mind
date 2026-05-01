"use client";

import { useState, useRef, useMemo, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TerminalInput } from "@/components/TerminalInput";
import { AgentTimeline } from "@/components/AgentTimeline";
import { SourceList } from "@/components/SourceList";
import { ReportView } from "@/components/ReportView";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { StatusBar } from "@/components/StatusBar";

interface AgentEvent {
  type: string;
  tool?: string;
  question?: string;
  question_number?: number;
  data?: Record<string, string | number | boolean | undefined>;
  timestamp?: string;
  url?: string;
  title?: string;
  content?: string;
  source_type?: string;
  error?: string;
  duration?: number;
  // SSE plan event fields
  session_id?: string;
  sub_questions?: string[];
  // SSE report event fields
  report?: string;
  metadata?: Record<string, unknown>;
}

interface ReportMetadata {
  topic?: string;
  word_count?: number;
  sources_cited?: number;
  questions_researched?: number;
  findings_used?: number;
  char_count?: number;
}

interface Source {
  url: string;
  title: string;
  excerpt?: string;
  source_type?: string;
}

function DashboardContent() {
  const [isResearching, setIsResearching] = useState(false);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [report, setReport] = useState("");
  const [metadata, setMetadata] = useState<ReportMetadata | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [maxQuestions, setMaxQuestions] = useState(5);
  const [startTime, setStartTime] = useState(0);
  const [elapsedDisplay, setElapsedDisplay] = useState("00:00");
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Topic state for retry from URL
  const [retryTopic, setRetryTopic] = useState("");

  // Handle reset when navigating with ?new=true or ?retry=true
  useEffect(() => {
    const topicParam = searchParams.get('topic');
    const isRetry = searchParams.get('retry') === 'true';
    
    if (topicParam && isRetry) {
      setRetryTopic(decodeURIComponent(topicParam));
      router.replace('/', { scroll: false });
    }
    
    if (searchParams.get('new') === 'true') {
      setRetryTopic("");
      setIsResearching(false);
      setEvents([]);
      setReport("");
      setMetadata(null);
      setSources([]);
      setError("");
      setSessionId(null);
      abortControllerRef.current?.abort();
      router.replace('/', { scroll: false });
    }
  }, [searchParams, router]);

  // Ticking elapsed time display
  useEffect(() => {
    if (!isResearching || !startTime) {
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const minutes = Math.floor(elapsed / 60).toString().padStart(2, "0");
      const seconds = (elapsed % 60).toString().padStart(2, "0");
      setElapsedDisplay(`${minutes}:${seconds}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [isResearching, startTime]);

  const currentStep = useMemo(() => {
    const questionEvents = events.filter(
      e => e.type === "status" && (e.data?.question_number || e.question_number)
    );
    if (questionEvents.length === 0) return 0;
    const last = questionEvents[questionEvents.length - 1];
    return (last.data?.question_number as number) || (last.question_number as number) || 0;
  }, [events]);

  const startResearch = useCallback(async (topic: string, context: string, numQuestions: number, includeArxiv: boolean) => {
    if (!topic.trim() || isResearching) return;

    setMaxQuestions(numQuestions);
    setStartTime(Date.now());
    setElapsedDisplay("00:00");
    setIsResearching(true);
    setEvents([]);
    setReport("");
    setMetadata(null);
    setSources([]);
    setError("");
    setSessionId(null);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          topic: topic.trim(),
          context: context.trim(),
          max_sub_questions: numQuestions,
          include_arxiv: includeArxiv,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(errorText || "Research request failed");
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

        let pendingEventType: string | null = null;

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line) continue;

          if (line.startsWith("event: ")) {
            pendingEventType = line.slice(7).trim();
            continue;
          }

          if (line.startsWith("data: ")) {
            try {
              const payload = JSON.parse(line.slice(6));
              const event = typeof payload === "object" && payload !== null
                ? { type: pendingEventType || payload.type || "message", ...payload }
                : { type: pendingEventType || "message", data: payload };

              setEvents((prev) => [...prev, event]);

              if (event.type === "plan" && event.session_id) {
                setSessionId(event.session_id);
              }
              if (event.type === "report" && event.report) {
                setReport(event.report);
                setMetadata(event.metadata || null);
              }
              if (event.type === "finding" && (event.url || event.data?.url)) {
                const url = (event.url || event.data?.url || "") as string;
                const title = (event.title || event.data?.source || event.data?.title || "") as string;
                const excerpt = (event.content || event.data?.summary || event.data?.excerpt || "") as string;
                setSources((prev) => [
                  ...prev,
                  {
                    url: url,
                    title: title,
                    excerpt: excerpt.slice(0, 200),
                    source_type: (event.source_type || event.data?.type || "web") as string,
                  },
                ]);
              }
              if (event.type === "error") {
                setError((event.error || event.data?.error || "An error occurred") as string);
              }
            } catch {
              // Skip malformed JSON
            } finally {
              pendingEventType = null;
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
  }, [isResearching]);

  const stopResearch = () => {
    abortControllerRef.current?.abort();
    setIsResearching(false);
  };

  const hasStarted = events.length > 0 || isResearching;

  // Handle research submission from TerminalInput — pass values directly (no stale state)
  const handleResearchSubmit = useCallback((t: string, c: string, q: number, a: boolean) => {
    startResearch(t, c, q, a);
  }, [startResearch]);

  return (
    <div className="flex flex-col min-h-full">
      {/* Status Bar - shows during research */}
      <StatusBar
        isActive={isResearching}
        currentQuestion={currentStep}
        totalQuestions={maxQuestions}
        elapsedTime={elapsedDisplay}
        onAbort={stopResearch}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Left: Timeline / Input */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {!hasStarted ? (
            <div className="flex items-center justify-center h-full pt-16 px-4">
              <TerminalInput 
                onSubmit={handleResearchSubmit}
                isResearching={isResearching}
                initialTopic={retryTopic}
              />
            </div>
          ) : (
            <div className="h-full overflow-hidden">
              <AgentTimeline 
                events={events}
                isActive={isResearching}
                currentQuestion={currentStep}
                totalQuestions={maxQuestions}
              />
            </div>
          )}
        </div>

        {/* Right: Sources Panel (desktop only) */}
        {hasStarted && (
          <div className="hidden lg:block w-[300px] min-w-[300px] h-full overflow-hidden">
            <SourceList sources={sources} />
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-[720px] px-4">
          <ErrorDisplay 
            error={error}
            onRetry={() => {
              setError("");
              // Can't auto-retry without original params — user should re-submit
            }}
            onDismiss={() => setError("")}
          />
        </div>
      )}

      {/* Report Modal / Overlay */}
      {report && (
        <div className="fixed inset-0 z-40 bg-[#020202] overflow-y-auto">
          <div className="pt-16 pb-8 px-4">
            <div className="flex items-center justify-between max-w-[800px] mx-auto mb-6">
              <button
                onClick={() => setReport("")}
                className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#8A8A8A] hover:text-[#F8F8F8] transition-colors"
              >
                [←] CLOSE REPORT
              </button>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push("/?new=true")}
                  className="bg-[#00D9FF] text-[#020202] font-mono text-[11px] font-semibold uppercase tracking-[0.05em] py-2 px-4 hover:bg-[#00C4E8] transition-colors"
                >
                  NEW RESEARCH
                </button>
              </div>
            </div>
            
            <ReportView content={report} metadata={metadata || undefined} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full pt-16">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-[#00D9FF] timeline-pulse" />
          <span className="font-mono text-[11px] text-[#484848]">LOADING...</span>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

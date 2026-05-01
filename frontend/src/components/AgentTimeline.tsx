"use client";

import { useMemo } from "react";
import { Check, AlertTriangle } from "lucide-react";

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
}

interface AgentTimelineProps {
  events: AgentEvent[];
  isActive: boolean;
  currentQuestion: number;
  totalQuestions: number;
}

const TOOL_LABELS: Record<string, string> = {
  web_search: "web_search",
  web_reader: "web_reader",
  arxiv_search: "arxiv_search",
  pdf_reader: "pdf_reader",
  summarizer: "summarize",
};

export function AgentTimeline({ events, isActive, currentQuestion, totalQuestions }: AgentTimelineProps) {
  const groupedEvents = useMemo(() => {
    const groups: { question: number; events: AgentEvent[] }[] = [];
    let currentGroup: AgentEvent[] = [];
    let currentQ = 0;

    events.forEach((event) => {
      // question_number may be at top level or inside data
      const qNum = event.question_number || (event.data?.question_number as number | undefined);
      if (qNum && qNum !== currentQ) {
        if (currentGroup.length > 0) {
          groups.push({ question: currentQ, events: currentGroup });
        }
        currentQ = qNum;
        currentGroup = [event];
      } else {
        currentGroup.push(event);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({ question: currentQ, events: currentGroup });
    }

    return groups;
  }, [events]);

  const progress = totalQuestions > 0 ? Math.round((currentQuestion / totalQuestions) * 100) : 0;
  const filledBlocks = Math.round((progress / 100) * 20);
  const progressBar = "█".repeat(filledBlocks) + "░".repeat(20 - filledBlocks);

  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      {/* Status Header */}
      <div className="flex items-center gap-4 mb-6 pb-4 border-b border-[rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-2">
          {isActive ? (
            <>
              <div className="w-1.5 h-1.5 bg-[#00D9FF] timeline-pulse" />
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#00D9FF]">
                LIVE
              </span>
            </>
          ) : (
            <>
              <div className="w-1.5 h-1.5 bg-[#1DB954]" />
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#8A8A8A]">
                COMPLETE
              </span>
            </>
          )}
        </div>

        {isActive && (
          <>
            <span className="font-mono text-[11px] text-[#484848]">
              RESEARCHING Q{currentQuestion} OF {totalQuestions}
            </span>
            <span className="font-mono text-[11px] text-[#00D9FF]">
              {progressBar} {progress}%
            </span>
          </>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {groupedEvents.map((group, groupIndex) => (
          <div key={groupIndex} className="relative">
            {/* Question Header */}
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#484848]">
                Q{group.question} / {totalQuestions}
              </span>
              <div className="flex-1 h-px bg-[rgba(255,255,255,0.04)]" />
              {group.events.some(e => e.type === "complete" || e.type === "done") ? (
                <Check className="w-3 h-3 text-[#1DB954]" />
              ) : isActive && group.question === currentQuestion ? (
                <div className="w-1.5 h-1.5 bg-[#00D9FF] timeline-pulse" />
              ) : null}
            </div>

            {/* Tool Events */}
            <div className="pl-4 border-l-2 border-[rgba(255,255,255,0.04)] space-y-2">
              {group.events.map((event, eventIndex) => {
                const isComplete = event.type === "complete" || event.type === "done" || event.type === "result";
                const isError = event.type === "error" || event.type === "tool_error";
                const isRunning = isActive && !isComplete && !isError;
                const toolName = TOOL_LABELS[event.tool || ""] || event.tool || "process";

                return (
                  <div
                    key={eventIndex}
                    className={`flex items-start gap-3 py-1 ${
                      isRunning ? "border-l-2 border-[#00D9FF] -ml-4 pl-3" : ""
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[12px] text-[#8A8A8A]">
                          {toolName}
                        </span>
                        {event.question && (
                          <span className="font-mono text-[11px] text-[#484848] truncate max-w-[200px]">
                            &ldquo;{event.question.slice(0, 50)}{event.question.length > 50 ? '...' : ''}&rdquo;
                          </span>
                        )}
                      </div>
                      {event.data && (event.data.papers_found || event.data.results) && (
                        <div className="font-mono text-[10px] text-[#484848] mt-0.5">
                          {event.data.papers_found && `${String(event.data.papers_found)} papers found`}
                          {event.data.results && `${String(event.data.results)} results`}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {event.duration && (
                        <span className="font-mono text-[10px] text-[#484848]">
                          {event.duration}ms
                        </span>
                      )}
                      {isComplete && <Check className="w-3 h-3 text-[#1DB954]" />}
                      {isError && <AlertTriangle className="w-3 h-3 text-[#E34234]" />}
                      {isRunning && <div className="w-1 h-1 bg-[#00D9FF] timeline-pulse" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {groupedEvents.length === 0 && isActive && (
          <div className="flex items-center gap-2 py-8">
            <div className="w-1.5 h-1.5 bg-[#00D9FF] timeline-pulse" />
            <span className="font-mono text-[12px] text-[#8A8A8A]">
              Initializing research sequence...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

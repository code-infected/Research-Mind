"use client";

import { useRef, useEffect, useMemo } from "react";
import { BrainCircuit, Globe, FileText, Scissors, BookOpen, AlertTriangle, Check, Terminal, CircleDot, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AgentEvent {
  type: string;
  message?: string;
  session_id?: string;
  topic?: string;
  sub_questions?: string[];
  report?: string;
  metadata?: Record<string, unknown>;
  error?: string;
  tool?: string;
  question?: string;
  result?: string;
  content?: string;
  url?: string;
  title?: string;
}

interface TimelineGroup {
  id: string;
  type: "plan" | "tool" | "status";
  planEvent?: AgentEvent;
  toolEvent?: AgentEvent;
  resultEvent?: AgentEvent;
  errorEvent?: AgentEvent;
  findings: AgentEvent[];
  statusEvent?: AgentEvent;
  isRunning: boolean;
}

const getToolConfig = (toolName?: string, hasError?: boolean) => {
  if (hasError) return { color: "#f43f5e", Icon: AlertTriangle };
  switch (toolName) {
    case "web_search": return { color: "#3b82f6", Icon: Globe };
    case "web_reader": return { color: "#06b6d4", Icon: FileText };
    case "summarizer": return { color: "#10b981", Icon: Scissors };
    case "arxiv_search": return { color: "#f59e0b", Icon: BookOpen };
    default: return { color: "#a1a1aa", Icon: Terminal };
  }
};

const deriveResultLabel = (e: AgentEvent) => {
  if (e.result) {
    const s = String(e.result);
    if (s.toLowerCase().includes("found") && s.toLowerCase().includes("results")) {
      const match = s.match(/(\d+)\s+results/i);
      if (match) return `${match[1]} results found`;
    }
    return "Content extracted";
  }
  return "Completed";
};

export default function AgentThinking({
  isActive,
  events,
}: {
  isActive: boolean;
  events: AgentEvent[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    if (events.length > 0) {
      const lastEvent = events[events.length - 1];
      if (lastEvent.type === "done" || lastEvent.type === "report") {
        setTimeout(() => {
          document.getElementById("report-section")?.scrollIntoView({ behavior: "smooth" });
        }, 300);
      }
    }
  }, [events]);

  const timeline = useMemo(() => {
    const groups: TimelineGroup[] = [];
    events.forEach((event, idx) => {
      if (
        (event.type === "status" && !event.message) ||
        (event.type === "tool_result" && !event.result) ||
        (event.type === "finding" && !event.content) ||
        ((event.type === "tool_error" || event.type === "error") && !event.error) ||
        (event.type === "plan" && (!event.sub_questions || event.sub_questions.length === 0))
      ) {
        return;
      }

      if (event.type === "plan") {
        groups.push({ id: `plan-${idx}`, type: "plan", planEvent: event, findings: [], isRunning: false });
      } else if (event.type === "tool_start") {
        groups.push({ id: `tool-${idx}`, type: "tool", toolEvent: event, findings: [], isRunning: true });
      } else if (event.type === "tool_result") {
        const lastTool = [...groups].reverse().find(g => g.type === "tool");
        if (lastTool) {
          lastTool.resultEvent = event;
          lastTool.isRunning = false;
        }
      } else if (event.type === "tool_error" || event.type === "error") {
        const lastTool = [...groups].reverse().find(g => g.type === "tool");
        if (lastTool) {
          lastTool.errorEvent = event;
          lastTool.isRunning = false;
        } else {
          groups.push({ id: `err-${idx}`, type: "status", statusEvent: event, findings: [], isRunning: false });
        }
      } else if (event.type === "finding") {
        const lastTool = [...groups].reverse().find(g => g.type === "tool");
        if (lastTool) {
          lastTool.findings.push(event);
        } else {
          groups.push({ id: `find-${idx}`, type: "tool", findings: [event], isRunning: false });
        }
      } else if (event.type === "status") {
        groups.push({ id: `status-${idx}`, type: "status", statusEvent: event, findings: [], isRunning: false });
      }
    });
    return groups;
  }, [events]);

  return (
    <div className="flex flex-col h-full bg-[#020202] shadow-glass border border-white/5 rounded-2xl overflow-hidden font-sans relative z-10">
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-primary/5 to-transparent opacity-50 pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 bg-black/60 backdrop-blur-md relative z-20">
        {isActive ? (
          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(139,92,246,0.8)]" />
        ) : (
          <CheckCircle2 size={16} className="text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] rounded-full" />
        )}
        <h2 className="text-[11px] font-bold text-zinc-300 uppercase tracking-widest">
          Agent Thinking
        </h2>
        {events.length > 0 && (
          <span className="ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/5">
            {events.length} steps
          </span>
        )}
      </div>

      {/* Feed */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-5 relative z-10"
      >
        {timeline.length === 0 && !isActive && (
          <div className="flex flex-col items-center justify-center h-full opacity-40">
            <BrainCircuit size={36} className="mb-4 text-zinc-500" />
            <p className="text-[13px] font-medium text-zinc-400">Awaiting task specification...</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {timeline.map((group) => {
            const itemAnimation = {
              initial: { opacity: 0, y: 15, scale: 0.98 },
              animate: { opacity: 1, y: 0, scale: 1 },
              transition: { duration: 0.4, ease: "easeOut" as const }
            };

            if (group.type === "plan") {
              return (
                <motion.div key={group.id} {...itemAnimation} className="relative group">
                  <div className="mb-2 flex items-center gap-2.5 text-primary">
                    <BrainCircuit size={16} />
                    <span className="text-[13.5px] font-semibold tracking-wide">Decomposing research topic</span>
                  </div>
                  <div className="pl-6 text-[12.5px] text-zinc-400">
                    <span className="inline-block mb-2 text-white/40 font-medium">Breaking into {group.planEvent?.sub_questions?.length || 0} sub-questions...</span>
                    <ul className="space-y-1.5">
                      {group.planEvent?.sub_questions?.map((q, i) => (
                        <li key={i} className="flex font-medium">
                          <span className="text-zinc-600 mr-2.5">─</span>
                          <span className="text-zinc-300">{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              );
            }

            if (group.type === "status") {
              return (
                <motion.div key={group.id} {...itemAnimation} className="flex items-center gap-2.5 pl-1 py-1">
                  <CircleDot size={12} className="text-zinc-600" />
                  <span className="text-[12.5px] font-medium text-zinc-400">
                    {group.statusEvent?.message || group.statusEvent?.error}
                  </span>
                </motion.div>
              );
            }

            if (group.type === "tool") {
              const hasError = !!group.errorEvent;
              const { color, Icon } = getToolConfig(group.toolEvent?.tool, hasError);
              
              return (
                <motion.div 
                  key={group.id} 
                  {...itemAnimation}
                  className="ml-2 pl-4 py-3.5 bg-[#050505] border border-white/5 rounded-xl transition-all duration-300 hover:border-white/10 relative overflow-hidden group"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: color }} />
                  <div className="absolute inset-0 opacity-[0.03] transition-opacity duration-300 group-hover:opacity-[0.06]" style={{ backgroundColor: color }} />
                  
                  <div className="flex items-center gap-2.5 mb-1.5 relative z-10">
                    <Icon size={14} className={group.isRunning ? "animate-pulse" : ""} color={color} />
                    <span className="text-[13px] font-semibold text-zinc-200 uppercase tracking-wider">
                      {group.toolEvent?.tool || "Executing Tool"}
                    </span>
                  </div>

                  {group.toolEvent?.question && (
                    <div className="text-[12.5px] text-zinc-400 ml-6 truncate max-w-[90%] font-mono bg-white/5 inline-block px-2 py-0.5 rounded text-zinc-300 border border-white/5 mt-1">
                      {String(group.toolEvent.question).slice(0, 60)}{String(group.toolEvent.question).length > 60 ? '...' : ''}
                    </div>
                  )}

                  {hasError && (
                    <div className="text-[12.5px] text-rose-400 ml-6 mt-2 font-mono flex items-center gap-2 bg-rose-500/10 px-2.5 py-1.5 rounded-md border border-rose-500/20 max-w-[95%]">
                      <AlertTriangle size={12} />
                      {group.errorEvent?.error}
                    </div>
                  )}

                  {group.resultEvent && !hasError && (
                    <div className="flex items-center gap-1.5 ml-6 mt-2 text-[11.5px] font-medium text-zinc-500 uppercase tracking-widest">
                      <Check size={12} className="text-emerald-500" />
                      {deriveResultLabel(group.resultEvent)}
                    </div>
                  )}

                  {group.findings.length > 0 && (
                    <div className="ml-6 mt-3 space-y-2.5 relative z-10">
                      {group.findings.map((finding, idx) => (
                        <div key={idx} className="text-[12.5px] pl-3 border-l-2 border-primary/40 py-0.5">
                          <span className="text-primary font-bold mr-2 text-[10px] uppercase tracking-widest bg-primary/10 px-1.5 py-0.5 rounded">Key Finding</span>
                          <span className="text-zinc-300 font-medium leading-relaxed">
                            {String(finding.content).slice(0, 80)}{String(finding.content).length > 80 ? '...' : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            }
            return null;
          })}
        </AnimatePresence>

        {isActive && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="flex items-center gap-2.5 pl-2 text-[12.5px] font-medium text-zinc-500 mt-2"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-ping" />
            Agent reasoning...
          </motion.div>
        )}
      </div>
    </div>
  );
}

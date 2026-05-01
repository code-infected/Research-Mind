"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { useState, useEffect } from "react";

interface SessionSummary {
  id: string;
  topic: string;
  status: string;
  created_at: string;
}

export function SideNavBar() {
  const pathname = usePathname();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);

  // Set sidebar width CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', '200px');
  }, []);

  // Fetch real sessions from backend
  useEffect(() => {
    fetch("/api/history?limit=10")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch");
        return r.json();
      })
      .then((data) => {
        setSessions(data.sessions || []);
      })
      .catch(() => {
        // Silently fail — sidebar just shows empty state
        setSessions([]);
      });
  }, []);

  const formatTimestamp = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toISOString().slice(0, 16).replace("T", " ");
    } catch {
      return "";
    }
  };

  return (
    <aside className="hidden md:flex flex-col h-[calc(100vh-48px)] w-[200px] border-r border-[rgba(255,255,255,0.04)] bg-[#080808] fixed top-12 left-0 py-4 z-40">
      {/* Section Header */}
      <div className="px-3 mb-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#484848]">
          SESSIONS
        </span>
      </div>

      {/* New Research Button */}
      <Link
        href="/?new=true"
        className="mx-3 mb-6 bg-[#00D9FF] text-[#020202] font-mono text-[11px] font-semibold uppercase tracking-[0.05em] py-2 px-3 flex items-center justify-center gap-2 hover:bg-[#00C4E8] active:scale-[0.995] transition-all"
      >
        <Plus className="w-3 h-3" />
        NEW
      </Link>

      {/* Session List */}
      <nav className="flex-1 overflow-y-auto px-1">
        {sessions.length === 0 ? (
          <div className="px-3 py-4">
            <span className="font-mono text-[10px] text-[#484848]">
              No sessions yet
            </span>
          </div>
        ) : (
          sessions.map((session) => {
            const isActive = activeSession === session.id;
            const isFailed = session.status === "failed";
            
            return (
              <Link
                key={session.id}
                href={session.status === "completed" ? `/research/result/${session.id}` : `/?retry=true&topic=${encodeURIComponent(session.topic)}`}
                onClick={() => setActiveSession(session.id)}
                className={`w-full block text-left p-3 mb-1 font-mono text-[12px] leading-tight transition-colors ${
                  isActive
                    ? "bg-[#0F0F0F] border-l-2 border-[#00D9FF] text-[#F8F8F8]"
                    : "text-[#8A8A8A] hover:bg-[#0F0F0F] border-l-2 border-transparent"
                }`}
              >
                <div className={`truncate mb-1 ${isFailed ? "text-[#E34234]" : ""}`}>
                  {isFailed && "● "}{session.topic}
                </div>
                <div className="text-[10px] text-[#484848]">
                  {formatTimestamp(session.created_at)}
                </div>
              </Link>
            );
          })
        )}
      </nav>

      {/* Bottom: Settings */}
      <div className="mt-auto pt-4 border-t border-[rgba(255,255,255,0.04)] px-3">
        <Link
          href="/settings"
          className={`font-mono text-[11px] uppercase tracking-[0.08em] transition-colors ${
            pathname === "/settings" 
              ? "text-[#00D9FF]" 
              : "text-[#484848] hover:text-[#8A8A8A]"
          }`}
        >
          [SETTINGS]
        </Link>
      </div>
    </aside>
  );
}

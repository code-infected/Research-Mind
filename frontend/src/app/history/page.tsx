"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Session {
  id: string;
  topic: string;
  status: string;
  sources_cited?: number;
  word_count?: number;
  created_at: string;
  completed_at?: string | null;
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "complete" | "failed">("all");

  useEffect(() => {
    fetch("/api/history")
      .then(async (r) => {
        if (!r.ok) throw new Error(`Failed to load history: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setSessions(data.sessions || []);
        setError("");
      })
      .catch((err) => {
        setSessions([]);
        setError(err instanceof Error ? err.message : "Failed to load history");
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredSessions = sessions.filter(s => {
    if (filter === "all") return true;
    if (filter === "complete") return s.status === "completed";
    if (filter === "failed") return s.status === "failed";
    return true;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toISOString().slice(0, 16).replace("T", " ");
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-4">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#484848]">
            HISTORY
          </span>
          <div className="h-3 w-px bg-[rgba(255,255,255,0.08)]" />
          <span className="font-mono text-[11px] text-[#8A8A8A]">
            {sessions.length} SESSIONS
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6">
        {(["all", "complete", "failed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`font-mono text-[11px] uppercase tracking-[0.08em] px-3 py-1.5 border transition-colors ${
              filter === f
                ? "text-[#F8F8F8] border-[rgba(255,255,255,0.08)] bg-[#0F0F0F]"
                : "text-[#484848] border-[rgba(255,255,255,0.04)] hover:text-[#8A8A8A] hover:border-[rgba(255,255,255,0.06)]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 border border-[#E34234]/30 bg-[#E34234]/5">
          <p className="font-mono text-[13px] text-[#E34234]">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-48 border border-[rgba(255,255,255,0.04)] bg-[#080808]">
          <div className="w-1.5 h-1.5 bg-[#00D9FF] timeline-pulse" />
          <span className="ml-2 font-mono text-[11px] text-[#484848]">LOADING...</span>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="border border-[rgba(255,255,255,0.04)] min-h-[200px] w-full">
          {filteredSessions.length === 0 ? (
            <div className="p-8 text-center">
              <span className="font-mono text-[13px] text-[#484848]">
                No sessions found.
              </span>
            </div>
          ) : (
            <div className="divide-y divide-[rgba(255,255,255,0.04)]">
              {filteredSessions.map((session, index) => {
                const isFailed = session.status === "failed";
                const isCompleted = session.status === "completed";
                const isEven = index % 2 === 0;

                return (
                  <div
                    key={session.id}
                    className={`flex items-center justify-between p-4 hover:bg-[#0F0F0F] transition-colors ${
                      isEven ? "bg-[#080808]" : "bg-[#0A0A0A]"
                    }`}
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[11px] text-[#484848]">
                          {formatDate(session.created_at)}
                        </span>
                        {isFailed && (
                          <span className="text-[#E34234]">●</span>
                        )}
                      </div>
                      <div className={`font-mono text-[14px] truncate ${isFailed ? "text-[#8A8A8A]" : "text-[#F8F8F8]"}`}>
                        {session.topic}
                      </div>
                      <div className="font-mono text-[11px] text-[#484848] mt-1">
                        {session.sources_cited || 0} sources · {(session.word_count || 0).toLocaleString()} words
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isFailed ? (
                        <Link
                          href={`/?retry=true&topic=${encodeURIComponent(session.topic)}`}
                          className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#E34234] hover:text-[#ff5a4a] transition-colors px-3 py-1.5 border border-[#E34234]/30"
                        >
                          RETRY
                        </Link>
                      ) : (
                        <Link
                          href={`/research/result/${session.id}`}
                          className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#8A8A8A] hover:text-[#00D9FF] transition-colors px-3 py-1.5 border border-[rgba(255,255,255,0.08)]"
                        >
                          VIEW
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

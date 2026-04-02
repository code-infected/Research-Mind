"use client";

import { useState, useEffect } from "react";

interface SessionSummary {
  id: string;
  topic: string;
  status: string;
  sources_cited: number;
  word_count: number;
  created_at: string;
  completed_at: string | null;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((data) => {
        setSessions(data.sessions || []);
        setTotal(data.total || 0);
      })
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 className="gradient-text" style={{ fontSize: "2rem", fontWeight: 700 }}>
          Research History
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "4px" }}>
          {total} past session{total !== 1 ? "s" : ""}
        </p>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: "80px" }} />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="glass-card" style={{ padding: "3rem", textAlign: "center" }}>
          <p style={{ fontSize: "2rem", marginBottom: "12px" }}>📭</p>
          <p style={{ color: "var(--text-muted)" }}>
            No research sessions yet.{" "}
            <a href="/" style={{ color: "var(--accent-indigo)", textDecoration: "none" }}>
              Start your first one →
            </a>
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {sessions.map((session) => (
            <a
              key={session.id}
              href={`/history/${session.id}`}
              className="glass-card"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                textDecoration: "none",
                cursor: "pointer",
                gap: "1rem",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {session.topic}
                </h3>
                <div style={{ display: "flex", gap: "1rem", marginTop: "6px" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    📅 {formatDate(session.created_at)}
                  </span>
                  {session.sources_cited > 0 && (
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      📚 {session.sources_cited} sources
                    </span>
                  )}
                  {session.word_count > 0 && (
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      📝 {session.word_count.toLocaleString()} words
                    </span>
                  )}
                </div>
              </div>
              <span className={`status-badge status-${session.status === "completed" ? "complete" : session.status}`}>
                {session.status}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

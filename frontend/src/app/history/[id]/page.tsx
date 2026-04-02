"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import ResearchReport from "@/components/ResearchReport";
import SourcePanel from "@/components/SourcePanel";

interface SessionData {
  id: string;
  topic: string;
  status: string;
  sub_questions: string[];
  created_at: string;
  completed_at: string | null;
  report: {
    content: string;
    bibliography: string;
    sources: { url: string; title: string; excerpt?: string; source_type?: string }[];
    sources_cited: number;
    findings_count: number;
    word_count: number;
  } | null;
}

export default function ReportPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/report/${sessionId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Report not found");
        return r.json();
      })
      .then(setSession)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div className="skeleton" style={{ height: "40px", width: "60%" }} />
        <div className="skeleton" style={{ height: "400px" }} />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="glass-card" style={{ padding: "3rem", textAlign: "center" }}>
        <p style={{ fontSize: "2rem", marginBottom: "12px" }}>🔍</p>
        <p style={{ color: "var(--accent-rose)" }}>{error || "Research session not found."}</p>
        <a href="/history" style={{ color: "var(--accent-indigo)", textDecoration: "none", fontSize: "0.9rem", display: "inline-block", marginTop: "1rem" }}>
          ← Back to History
        </a>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <a href="/history" style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: "0.8rem", display: "inline-block", marginBottom: "8px" }}>
          ← History
        </a>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)" }}>
          {session.topic}
        </h1>
        <div style={{ display: "flex", gap: "1rem", marginTop: "6px" }}>
          <span className={`status-badge status-${session.status === "completed" ? "complete" : session.status}`}>
            {session.status}
          </span>
          {session.created_at && (
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", alignSelf: "center" }}>
              {new Date(session.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </span>
          )}
        </div>
      </div>

      {/* Content — report + sources */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.5rem", alignItems: "start" }}>
        <div>
          {session.report ? (
            <ResearchReport
              content={session.report.content}
              metadata={{
                word_count: session.report.word_count,
                sources_cited: session.report.sources_cited,
                questions_researched: session.sub_questions?.length,
                findings_used: session.report.findings_count,
              }}
            />
          ) : (
            <div className="glass-card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
              No report generated for this session.
            </div>
          )}
        </div>

        <div>
          {session.report?.sources && session.report.sources.length > 0 && (
            <SourcePanel sources={session.report.sources} />
          )}

          {/* Sub-questions card */}
          {session.sub_questions && session.sub_questions.length > 0 && (
            <div className="glass-card" style={{ padding: "16px", marginTop: "12px" }}>
              <h3 style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "10px" }}>
                🧠 Research Questions
              </h3>
              <ol style={{ paddingLeft: "1.25rem", color: "var(--text-secondary)", fontSize: "0.8rem", lineHeight: 1.8 }}>
                {session.sub_questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

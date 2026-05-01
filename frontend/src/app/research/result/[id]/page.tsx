"use client";

import { useState, useEffect } from "react";
import { ReportView } from "@/components/ReportView";
import Link from "next/link";

interface ReportData {
  id: string;
  topic: string;
  status: string;
  sub_questions?: string[];
  created_at: string;
  completed_at?: string;
  duration_seconds?: number;
  report?: {
    id: string;
    content: string;
    bibliography: string;
    sources_cited: number;
    findings_count: number;
    word_count: number;
    sources?: Array<{
      number: number;
      title: string;
      url: string;
      source_type?: string;
    }>;
  };
}

export default function ResultPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    fetch(`/api/report/${id}`)
      .then(async (r) => {
        if (!r.ok) {
          if (r.status === 404) throw new Error("Report not found");
          throw new Error(`Failed to load report: ${r.status}`);
        }
        return r.json();
      })
      .then((reportData) => {
        setData(reportData);
        setError("");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load report");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-[#00D9FF] timeline-pulse" />
          <span className="font-mono text-[11px] text-[#484848]">LOADING REPORT...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[720px] mx-auto px-4 py-16">
        <div className="border border-[#E34234]/30 bg-[#E34234]/5 p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#E34234] mb-2">
            Error
          </p>
          <p className="font-mono text-[13px] text-[#8A8A8A] mb-4">{error}</p>
          <div className="flex items-center gap-3">
            <Link
              href="/history"
              className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#8A8A8A] hover:text-[#F8F8F8] transition-colors px-3 py-1.5 border border-[rgba(255,255,255,0.08)]"
            >
              ← BACK TO HISTORY
            </Link>
            <Link
              href="/?new=true"
              className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#00D9FF] hover:text-[#00C4E8] transition-colors px-3 py-1.5 border border-[#00D9FF]/30"
            >
              NEW RESEARCH
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!data || !data.report) {
    return (
      <div className="max-w-[720px] mx-auto px-4 py-16 text-center">
        <p className="font-mono text-[13px] text-[#484848] mb-4">No report data available.</p>
        <Link
          href="/history"
          className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#8A8A8A] hover:text-[#F8F8F8] transition-colors"
        >
          ← BACK TO HISTORY
        </Link>
      </div>
    );
  }

  // Calculate duration from timestamps if not directly available
  let durationSeconds: number | undefined;
  if (data.completed_at && data.created_at) {
    durationSeconds = Math.floor(
      (new Date(data.completed_at).getTime() - new Date(data.created_at).getTime()) / 1000
    );
  }

  return (
    <div className="py-6 px-4">
      {/* Nav */}
      <div className="flex items-center justify-between max-w-[800px] mx-auto mb-6">
        <Link
          href="/history"
          className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#8A8A8A] hover:text-[#F8F8F8] transition-colors"
        >
          [←] BACK TO HISTORY
        </Link>
        <Link
          href="/?new=true"
          className="bg-[#00D9FF] text-[#020202] font-mono text-[11px] font-semibold uppercase tracking-[0.05em] py-2 px-4 hover:bg-[#00C4E8] transition-colors"
        >
          NEW RESEARCH
        </Link>
      </div>

      <ReportView
        content={data.report.content}
        metadata={{
          topic: data.topic,
          word_count: data.report.word_count,
          sources_cited: data.report.sources_cited,
          questions_researched: data.sub_questions?.length || 0,
          findings_used: data.report.findings_count,
          duration_seconds: durationSeconds,
        }}
      />
    </div>
  );
}

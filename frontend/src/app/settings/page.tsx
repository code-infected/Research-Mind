"use client";

export default function SettingsPage() {
  return (
    <div className="max-w-[720px] mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-8 pb-4 border-b border-[rgba(255,255,255,0.04)]">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#484848]">
          SETTINGS
        </span>
      </div>

      {/* Configuration Info */}
      <div className="mb-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#8A8A8A] mb-4">
          CONFIGURATION
        </div>
        <div className="h-px bg-[rgba(255,255,255,0.04)] mb-6" />

        <div className="border border-[rgba(255,255,255,0.08)] bg-[#0F0F0F] p-6">
          <p className="font-mono text-[13px] text-[#8A8A8A] leading-relaxed mb-4">
            ResearchMind is configured via environment variables. Edit the <code className="text-[#00D9FF] bg-[#080808] px-1.5 py-0.5">.env</code> file in the project root to change settings.
          </p>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.04)]">
              <span className="font-mono text-[13px] text-[#F8F8F8]">LLM PROVIDER</span>
              <span className="font-mono text-[13px] text-[#00D9FF]">
                {process.env.NEXT_PUBLIC_BACKEND_URL ? "CONFIGURED" : "NOT SET"}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.04)]">
              <span className="font-mono text-[13px] text-[#F8F8F8]">BACKEND URL</span>
              <span className="font-mono text-[13px] text-[#8A8A8A]">
                {process.env.NEXT_PUBLIC_BACKEND_URL || "NOT SET"}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.04)]">
              <span className="font-mono text-[13px] text-[#F8F8F8]">AUTHENTICATION</span>
              <span className="font-mono text-[13px] text-[#8A8A8A]">
                CLERK
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Research Defaults Info */}
      <div className="mb-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#8A8A8A] mb-4">
          DEFAULT RESEARCH PARAMETERS
        </div>
        <div className="h-px bg-[rgba(255,255,255,0.04)] mb-6" />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[13px] text-[#F8F8F8]">MAX SUB-QUESTIONS</span>
            <span className="font-mono text-[13px] text-[#8A8A8A]">5</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[13px] text-[#F8F8F8]">MAX SOURCES / QUESTION</span>
            <span className="font-mono text-[13px] text-[#8A8A8A]">3</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[13px] text-[#F8F8F8]">INCLUDE ARXIV</span>
            <span className="font-mono text-[13px] text-[#8A8A8A]">YES</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[13px] text-[#F8F8F8]">MAX REPORT LENGTH</span>
            <span className="font-mono text-[13px] text-[#8A8A8A]">15,000 chars</span>
          </div>
        </div>
      </div>

      {/* Env vars reference */}
      <div className="mb-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#484848] mb-4">
          ENVIRONMENT VARIABLES
        </div>
        <div className="h-px bg-[rgba(255,255,255,0.04)] mb-6" />

        <div className="bg-[#080808] border border-[rgba(255,255,255,0.04)] p-4 font-mono text-[12px] text-[#8A8A8A] leading-relaxed">
          <div className="text-[#484848] mb-2"># Key variables (see .env.example)</div>
          <div><span className="text-[#00D9FF]">LLM_PROVIDER</span>=groq</div>
          <div><span className="text-[#00D9FF]">LLM_MODEL</span>=groq/llama-3.3-70b-versatile</div>
          <div><span className="text-[#00D9FF]">GROQ_API_KEY</span>=gsk_...</div>
          <div><span className="text-[#00D9FF]">TAVILY_API_KEY</span>=tvly-...</div>
          <div><span className="text-[#00D9FF]">DATABASE_URL</span>=postgresql://...</div>
          <div><span className="text-[#00D9FF]">CLERK_SECRET_KEY</span>=sk_test_...</div>
        </div>
      </div>
    </div>
  );
}

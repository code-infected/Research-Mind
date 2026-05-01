"use client";

interface Source {
  url: string;
  title: string;
  excerpt?: string;
  source_type?: string;
  question?: string;
}

interface SourceListProps {
  sources: Source[];
}

export function SourceList({ sources }: SourceListProps) {
  const domainFromUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace("www.", "");
    } catch {
      return url;
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#080808] border-l border-[rgba(255,255,255,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.04)]">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#8A8A8A]">
          SOURCES
        </span>
        <span className="font-mono text-[11px] text-[#484848]">
          {sources.length.toString().padStart(2, "0")}
        </span>
      </div>

      {/* Source List */}
      <div className="flex-1 overflow-y-auto">
        {sources.length === 0 ? (
          <div className="p-4 text-center">
            <span className="font-mono text-[11px] text-[#484848]">
              No sources yet
            </span>
          </div>
        ) : (
          <div className="divide-y divide-[rgba(255,255,255,0.04)]">
            {sources.map((source, index) => (
              <a
                key={index}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 hover:bg-[#0F0F0F] transition-colors group"
              >
                <div className="flex items-start gap-2">
                  <span className="font-mono text-[10px] text-[#484848] w-4">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[12px] text-[#F8F8F8] truncate group-hover:text-[#00D9FF] transition-colors">
                      {domainFromUrl(source.url)}
                    </div>
                    <div className="font-mono text-[11px] text-[#8A8A8A] truncate mt-0.5">
                      {source.title || source.excerpt?.slice(0, 60) || "Untitled source"}
                    </div>
                    {source.question && (
                      <div className="font-mono text-[10px] text-[#484848] mt-1">
                        Q: {source.question}
                      </div>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {sources.length > 0 && (
        <div className="px-4 py-3 border-t border-[rgba(255,255,255,0.04)]">
          <span className="font-mono text-[11px] text-[#484848]">
            {sources.length} source{sources.length !== 1 ? "s" : ""} discovered
          </span>
        </div>
      )}
    </div>
  );
}

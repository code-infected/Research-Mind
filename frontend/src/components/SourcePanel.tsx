"use client";

import { motion } from "framer-motion";

interface Source {
  url: string;
  title: string;
  excerpt?: string;
  source_type?: string;
}

function getFavicon(url: string): string {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`;
  } catch {
    return "";
  }
}

function truncateUrl(url: string, maxLen = 50): string {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 30 ? u.pathname.slice(0, 30) + "..." : u.pathname;
    return u.hostname + path;
  } catch {
    return url.length > maxLen ? url.slice(0, maxLen) + "..." : url;
  }
}

function SourceCard({ source }: { source: Source }) {
  return (
    <motion.a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="flex gap-3 p-3.5 rounded-xl bg-white/5 border border-white/5 no-underline transition-colors duration-300 hover:bg-primary/5 hover:border-primary/30 group block"
    >
      {/* Favicon */}
      <div className="w-5 h-5 flex-shrink-0 mt-0.5 relative z-10">
        {getFavicon(source.url) && (
          <img
            src={getFavicon(source.url)}
            alt=""
            width={20}
            height={20}
            className="rounded opacity-90 group-hover:opacity-100 transition-opacity"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-semibold text-zinc-200 leading-snug mb-1 overflow-hidden text-ellipsis whitespace-nowrap group-hover:text-primary transition-colors">
          {source.title || "Untitled"}
        </p>
        <p className="text-[11.5px] text-zinc-500 overflow-hidden text-ellipsis whitespace-nowrap">
          {truncateUrl(source.url)}
        </p>
        {source.excerpt && (
          <p className="text-[12px] text-zinc-400 mt-2 leading-relaxed line-clamp-2">
            {source.excerpt}
          </p>
        )}
      </div>
      {source.source_type && (
        <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-widest self-start ${source.source_type === 'arxiv' ? 'bg-primary/10 text-primary' : 'bg-cyan-500/10 text-cyan-400'}`}>
          {source.source_type}
        </span>
      )}
    </motion.a>
  );
}

export default function SourcePanel({ sources }: { sources: Source[] }) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="bg-[#020202] shadow-glass border border-white/5 rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[60px] opacity-30 pointer-events-none" />
      <h3 className="text-[14px] font-semibold text-zinc-200 mb-4 flex items-center gap-2 relative z-10">
        📚 Sources
        <span className="text-[11px] text-zinc-500 font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
          {sources.length}
        </span>
      </h3>
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.1 } }
        }}
        className="flex flex-col gap-2.5 relative z-10"
      >
        {sources.map((source, i) => (
          <motion.div 
            key={i}
            variants={{
              hidden: { opacity: 0, x: 20 },
              visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } }
            }}
          >
            <SourceCard source={source} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

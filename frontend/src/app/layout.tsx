import { ClerkProvider, SignInButton, UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResearchMind — AI Research Agent",
  description: "Autonomous AI research agent that searches the web, reads papers, synthesizes findings, and produces structured reports with citations.",
  keywords: ["AI", "research", "agent", "MCP", "citations", "autonomous"],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();

  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <style>{`
            .nav-link { color: var(--text-secondary); text-decoration: none; font-size: 0.85rem; font-weight: 500; transition: color 0.3s ease; }
            .nav-link:hover { color: var(--text-primary); }
            .nav-link-muted { color: var(--text-muted); text-decoration: none; font-size: 0.8rem; font-weight: 500; transition: color 0.3s ease; }
            .nav-link-muted:hover { color: var(--text-secondary); }
          `}</style>
        </head>
        <body>
          <div className="min-h-screen flex flex-col">
            {/* Navigation */}
            <nav
              style={{
                background: "rgba(0, 0, 0, 0.5)",
                backdropFilter: "blur(24px)",
                borderBottom: "1px solid var(--border-subtle)",
                position: "sticky",
                top: 0,
                zIndex: 50,
                transition: "all 0.3s ease",
              }}
            >
              <div
                style={{
                  maxWidth: "1400px",
                  margin: "0 auto",
                  padding: "0 2rem",
                  height: "64px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "1.5rem" }}>🧠</span>
                  <span className="gradient-text" style={{ fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.04em" }}>
                    ResearchMind
                  </span>
                </a>
                <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                  <a href="/history" className="nav-link">
                    History
                  </a>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nav-link-muted"
                  >
                    GitHub ↗
                  </a>
                  <div style={{ paddingLeft: "1.5rem", borderLeft: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", height: "32px" }}>
                    {!userId ? (
                      <SignInButton mode="modal">
                        <button className="nav-link" style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px 8px" }}>Sign In</button>
                      </SignInButton>
                    ) : (
                      <UserButton 
                        appearance={{ 
                          elements: { 
                            userButtonAvatarBox: { width: "32px", height: "32px", border: "1px solid var(--border-subtle)" } 
                          } 
                        }} 
                      />
                    )}
                  </div>
                </div>
              </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1" style={{ maxWidth: "1400px", margin: "0 auto", padding: "2rem", width: "100%" }}>
              {children}
            </main>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}

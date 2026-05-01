import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { SideNavBar } from "@/components/layout/SideNavBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./globals.css";

export const metadata: Metadata = {
  title: "RESEARCHMIND",
  description: "Autonomous AI research agent. Terminal-precision intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className="bg-[#020202] text-[#F8F8F8] min-h-screen flex flex-col antialiased selection:bg-[#00D9FF]/30">
          <ErrorBoundary>
            <Navbar />
            <SideNavBar />
            <main className="flex-1 flex flex-col w-full pt-12 pb-16 md:pb-0 transition-all duration-300" style={{ marginLeft: 'var(--sidebar-width, 200px)' }}>
              {children}
            </main>
            <MobileNav />
          </ErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  );
}

import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { FloatingChatWidget } from '@/components/layout/FloatingChatWidget';
import { RunProvider } from '@/lib/RunContext';

export const metadata: Metadata = {
  title: 'Realm Verify — Evidence-Bound Multi-Ledger Reconciliation',
  description:
    'Autonomous financial reconciliation across internal ledger, gateway payouts, and bank statements with 0-paise integer arithmetic and SHA-256 evidence ledger.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="bg-background text-foreground antialiased selection:bg-accent/30 selection:text-white min-h-screen flex flex-col relative overflow-x-hidden">
        {/* Background Ambient Glow & Grid Layer */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-accent/10 blur-[140px] animate-mesh-slow" />
          <div className="absolute top-[40%] right-[-5%] w-[500px] h-[500px] rounded-full bg-[#3B82F6]/10 blur-[130px] animate-mesh-slow" style={{ animationDelay: '4s' }} />
          <div className="absolute bottom-[-10%] left-[10%] w-[700px] h-[700px] rounded-full bg-[#6366F1]/08 blur-[160px] animate-mesh-slow" style={{ animationDelay: '8s' }} />
          <div className="absolute inset-0 bg-mesh-grid opacity-60" />
        </div>

        <RunProvider>
          {/* Global Floating Pill Navbar */}
          <Navbar />

          {/* Main Application Content */}
          <main className="flex-1 relative z-10 w-full pt-20 pb-16">
            {children}
          </main>

          {/* Global Floating AI Explain Assistant */}
          <FloatingChatWidget />

          {/* Global Footer */}
          <Footer />
        </RunProvider>
      </body>
    </html>
  );
}

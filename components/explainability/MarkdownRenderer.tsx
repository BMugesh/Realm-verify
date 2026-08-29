'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CheckCircle2, AlertTriangle, XCircle, Lock, Layers, Activity } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  // Pre-process text to highlight common status keywords and entity codes cleanly if not already wrapped
  return (
    <div className={`prose prose-invert max-w-none text-xs sm:text-sm font-sans leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Styled Glassmorphic Tables
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-3 rounded-xl border border-white/15 bg-black/40 shadow-inner custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs font-mono" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-white/[0.08] border-b border-white/15 text-accent font-mono text-[11px] uppercase tracking-wider font-bold" {...props} />
          ),
          tbody: ({ node, ...props }) => (
            <tbody className="divide-y divide-white/05 font-mono text-xs text-white/90" {...props} />
          ),
          tr: ({ node, ...props }) => (
            <tr className="hover:bg-white/[0.04] transition-colors" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="px-3.5 py-2.5 text-left font-bold text-accent border-r border-white/10 last:border-r-0 whitespace-nowrap" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-3.5 py-2.5 border-r border-white/05 last:border-r-0 text-white/90 leading-snug" {...props} />
          ),

          // Headings
          h1: ({ node, ...props }) => (
            <h1 className="text-base sm:text-lg font-bold font-mono text-white mt-4 mb-2 pb-1 border-b border-white/10 flex items-center gap-2" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-sm sm:text-base font-bold font-mono text-accent mt-3.5 mb-1.5 flex items-center gap-1.5" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-xs sm:text-sm font-bold font-mono text-white/90 mt-2.5 mb-1 tracking-wide" {...props} />
          ),

          // Paragraphs & Text
          p: ({ node, ...props }) => (
            <p className="my-1.5 leading-relaxed text-white/90 text-xs sm:text-sm font-sans" {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong className="text-white font-bold tracking-tight" {...props} />
          ),
          em: ({ node, ...props }) => (
            <em className="text-white/80 italic" {...props} />
          ),

          // Inline & Block Code / Entity IDs
          code: ({ node, inline, className, children, ...props }: any) => {
            const codeText = String(children).replace(/\n$/, '');
            
            // Highlight Status Badges
            if (codeText === 'AUTO_APPROVED') {
              return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-full bg-status-approved/15 text-status-approved border border-status-approved/30 text-[10px] font-mono font-bold">
                  <CheckCircle2 className="w-2.5 h-2.5" /> AUTO_APPROVED
                </span>
              );
            }
            if (codeText === 'NEEDS_REVIEW') {
              return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-full bg-status-review/15 text-status-review border border-status-review/30 text-[10px] font-mono font-bold">
                  <AlertTriangle className="w-2.5 h-2.5" /> NEEDS_REVIEW
                </span>
              );
            }
            if (codeText === 'UNRESOLVED') {
              return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-full bg-status-unresolved/15 text-status-unresolved border border-status-unresolved/30 text-[10px] font-mono font-bold">
                  <XCircle className="w-2.5 h-2.5" /> UNRESOLVED
                </span>
              );
            }

            // Entity IDs (TXN_..., BNK_..., PO_...)
            if (/^(TXN_|BNK_|PO_|BANK_|FLPK-|AMZN-|PAYT-|BLNK-|MMTR-|EVT_)/.test(codeText)) {
              return (
                <code className="px-1.5 py-0.5 mx-0.5 rounded bg-accent/15 text-accent font-mono text-[11px] font-semibold border border-accent/25 tracking-wide">
                  {codeText}
                </code>
              );
            }

            // Standard code
            if (inline) {
              return (
                <code className="px-1.5 py-0.5 mx-0.5 rounded bg-white/10 text-accent font-mono text-[11px] font-semibold border border-white/10" {...props}>
                  {children}
                </code>
              );
            }

            return (
              <pre className="p-3 my-2 rounded-xl bg-black/60 border border-white/15 text-accent font-mono text-xs overflow-x-auto custom-scrollbar">
                <code>{children}</code>
              </pre>
            );
          },

          // Lists & Items
          ul: ({ node, ...props }) => (
            <ul className="my-2 space-y-1 pl-1 list-none" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="my-2 space-y-1 pl-4 list-decimal text-accent" {...props} />
          ),
          li: ({ node, children, ...props }) => (
            <li className="flex items-start gap-2 text-white/90 text-xs sm:text-sm leading-relaxed" {...props}>
              <span className="text-accent text-[10px] mt-1 shrink-0">◆</span>
              <div className="flex-1">{children}</div>
            </li>
          ),

          // Blockquotes / Callout Boxes
          blockquote: ({ node, ...props }) => (
            <blockquote className="my-2.5 pl-3.5 py-2 border-l-2 border-accent bg-accent/05 rounded-r-xl text-white/80 italic font-sans text-xs" {...props} />
          ),

          // Horizontal rule
          hr: ({ node, ...props }) => (
            <hr className="my-3 border-white/10" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

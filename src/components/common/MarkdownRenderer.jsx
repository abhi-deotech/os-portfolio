import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

/**
 * Premium Markdown Renderer for Lumina OS.
 * Uses react-markdown for parsing and react-syntax-highlighter for code blocks.
 * Supports GFM (GitHub Flavored Markdown).
 * 
 * @param {string} content - Markdown content to render.
 * @param {string} className - Additional CSS classes for the container.
 */
const MarkdownRenderer = ({ content, className = '' }) => {
  return (
    <div className={`prose prose-invert max-w-none prose-pre:bg-transparent prose-pre:p-0 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <div className="rounded-xl overflow-hidden my-4 border border-os-outline/10 shadow-2xl">
                <div className="bg-os-surfaceContainerHighest px-4 py-2 flex items-center justify-between border-b border-os-outline/10">
                  <span className="text-[10px] font-black uppercase tracking-widest text-os-onSurfaceVariant">
                    {match[1]}
                  </span>
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                  </div>
                </div>
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    padding: '1.5rem',
                    fontSize: '0.85rem',
                    backgroundColor: 'rgba(var(--os-surface-container-low-rgb, 13, 17, 23), 0.8)',
                    backdropBlur: '12px',
                  }}
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code className={`${className} bg-os-surfaceContainerHighest px-1.5 py-0.5 rounded text-os-primary text-sm`} {...props}>
                {children}
              </code>
            );
          },
          h1: ({ children }) => {
            const id = React.Children.toArray(children).join('').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
            return <h1 id={id} className="text-3xl font-black mb-6 mt-8 bg-gradient-to-r from-os-primary to-os-secondary bg-clip-text text-transparent w-fit">{children}</h1>;
          },
          h2: ({ children }) => {
            const id = React.Children.toArray(children).join('').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
            return <h2 id={id} className="text-2xl font-bold mb-4 mt-8 text-os-onSurface border-b border-os-outline/10 pb-2">{children}</h2>;
          },
          h3: ({ children }) => {
            const id = React.Children.toArray(children).join('').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
            return <h3 id={id} className="text-xl font-bold mb-3 mt-6 text-os-onSurface">{children}</h3>;
          },
          p: ({ children }) => <p className="mb-4 text-os-onSurfaceVariant leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="mb-4 space-y-2 list-none">{children}</ul>,
          li: ({ children }) => (
            <li className="flex gap-3 text-os-onSurfaceVariant">
              <span className="text-os-primary mt-1.5">•</span>
              <span>{children}</span>
            </li>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-6 rounded-xl border border-os-outline/10 bg-os-surfaceContainerLow/30">
              <table className="w-full text-sm text-left border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-os-surfaceContainerHighest/50 text-os-onSurface font-bold uppercase text-[10px] tracking-widest">{children}</thead>,
          th: ({ children }) => <th className="px-4 py-3 border-b border-os-outline/10">{children}</th>,
          td: ({ children }) => <td className="px-4 py-3 border-b border-os-outline/10 text-os-onSurfaceVariant">{children}</td>,
          tr: ({ children }) => <tr className="hover:bg-white/5 transition-colors">{children}</tr>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-os-primary bg-os-primary/10 px-6 py-4 rounded-r-xl italic my-6 text-os-onSurfaceVariant leading-relaxed">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-8 border-os-outline/10" />,
          a: ({ href, children }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-os-secondary hover:text-os-primary transition-colors underline decoration-os-secondary/30 underline-offset-4"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;

'use client';

import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import '@/styles/highlight.css';

interface Props {
  content?: string | null;
}

export default function ArticleRenderer({ content }: Props) {
  const [showTOC, setShowTOC] = useState(false);
  const [headings, setHeadings] = useState<{ id: string; text: string; level: number }[]>([]);

  useEffect(() => {
    if (content) {
      const headingMatches = content.match(/^#{1,6}\s+(.+)$/gm);
      if (headingMatches && headingMatches.length > 1) {
        const parsedHeadings = headingMatches.map((heading, index) => {
          const level = heading.match(/^#+/)?.[0].length || 1;
          const text = heading.replace(/^#+\s+/, '');
          return {
            id: `heading-${index}`,
            text: text,
            level: level
          };
        });
        setHeadings(parsedHeadings);
      }
    }
  }, [content]);

  if (!content) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Article Content</h3>
          <p className="text-gray-500">This lesson doesn't have any article content yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Article Header with TOC toggle */}
      {headings.length > 1 && (
        <div className="bg-gray-50 px-8 py-4 border-b border-gray-200">
          <button
            onClick={() => setShowTOC(!showTOC)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            <svg className={`w-4 h-4 transition-transform ${showTOC ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Table of Contents
            <span className="text-gray-500">({headings.length} sections)</span>
          </button>

          {/* Table of Contents */}
          {showTOC && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
              <nav className="space-y-1">
                {headings.map((heading, index) => (
                  <a
                    key={heading.id}
                    href={`#${heading.id}`}
                    className={`block py-1 text-sm hover:text-blue-600 transition-colors ${
                      heading.level === 1 
                        ? 'font-semibold text-gray-900' 
                        : heading.level === 2 
                          ? 'font-medium text-gray-800 pl-3' 
                          : 'text-gray-600 pl-6'
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      const element = document.getElementById(heading.id);
                      element?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    {heading.text}
                  </a>
                ))}
              </nav>
            </div>
          )}
        </div>
      )}

      <div className="p-8">
        <article className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-strong:text-gray-900 prose-code:text-pink-600 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50 prose-blockquote:text-blue-900 prose-hr:border-gray-300">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight, rehypeRaw, rehypeSanitize]}
            components={{
              h1: ({ children, ...props }: any) => {
                const headingIndex = headings.findIndex(h => h.text === children);
                const id = headingIndex >= 0 ? headings[headingIndex].id : undefined;
                return (
                  <h1 id={id} className="text-3xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200" {...props}>
                    {children}
                  </h1>
                );
              },
              h2: ({ children, ...props }: any) => {
                const headingIndex = headings.findIndex(h => h.text === children);
                const id = headingIndex >= 0 ? headings[headingIndex].id : undefined;
                return (
                  <h2 id={id} className="text-2xl font-semibold text-gray-900 mb-4 mt-8" {...props}>
                    {children}
                  </h2>
                );
              },
              h3: ({ children, ...props }: any) => {
                const headingIndex = headings.findIndex(h => h.text === children);
                const id = headingIndex >= 0 ? headings[headingIndex].id : undefined;
                return (
                  <h3 id={id} className="text-xl font-semibold text-gray-900 mb-3 mt-6" {...props}>
                    {children}
                  </h3>
                );
              },
              p: ({ children }) => (
                <p className="text-gray-700 mb-4 leading-relaxed">
                  {children}
                </p>
              ),
              a: ({ children, href }) => (
                <a 
                  href={href} 
                  className="text-blue-600 hover:text-blue-800 underline transition-colors"
                  target={href?.startsWith('http') ? '_blank' : undefined}
                  rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                >
                  {children}
                </a>
              ),
              code: ({ children, className, ...props }: any) => {
                const isInline = !className?.includes('language-');
                if (isInline) {
                  return (
                    <code className="bg-gray-100 text-pink-600 px-2 py-1 rounded text-sm font-mono" {...props}>
                      {children}
                    </code>
                  );
                }
                const codeString = String(children).replace(/\n$/, '');
                const language = className?.replace('language-', '') || 'text';
                
                return (
                  <div className="relative group">
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </pre>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(codeString);
                      }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded text-xs"
                      title="Copy code"
                    >
                      Copy
                    </button>
                    {language !== 'text' && (
                      <div className="absolute top-2 left-2 text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                        {language}
                      </div>
                    )}
                  </div>
                );
              },
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-blue-500 bg-blue-50 pl-4 py-2 my-6 italic text-blue-900">
                  {children}
                </blockquote>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside mb-4 space-y-2 text-gray-700">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-700">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="mb-1">
                  {children}
                </li>
              ),
              img: ({ src, alt }) => (
                <div className="my-6">
                  <img 
                    src={src} 
                    alt={alt || ''} 
                    className="max-w-full h-auto rounded-lg shadow-sm border border-gray-200"
                  />
                  {alt && (
                    <p className="text-sm text-gray-500 text-center mt-2 italic">
                      {alt}
                    </p>
                  )}
                </div>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-6">
                  <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-gray-50">
                  {children}
                </thead>
              ),
              th: ({ children }) => (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-4 py-3 text-sm text-gray-900 border-t border-gray-200">
                  {children}
                </td>
              ),
              hr: () => (
                <hr className="my-8 border-gray-300" />
              )
            }}
          >
            {content}
          </ReactMarkdown>
        </article>
      </div>
      
      {/* Reading progress indicator */}
      <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Reading time: ~{Math.ceil((content || '').split(' ').length / 200)} min</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>{(content || '').split(' ').length} words</span>
          </div>
        </div>
      </div>
    </div>
  );
}

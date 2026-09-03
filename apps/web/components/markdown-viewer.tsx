/**
 * @file markdown-viewer.tsx
 * @description Renders Markdown text as styled HTML using react-markdown.
 * @architecture Supports syntax highlighting and custom components to integrate seamlessly with the app's UI theme.
 */
"use client";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Copy, Check } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism";

/**
 * @desc    Render a fenced code block with a copy-to-clipboard button
 * @param   {{code: string, language: string}} props - The code text and language
 * @returns {JSX.Element} The formatted code block
 */
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group my-4 rounded-md overflow-hidden bg-white/10">
      <Button
        onClick={() => {
          navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-8 px-2 text-[#6247aa] bg-[#dec9e9] opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
        <span className="ml-1 text-xs">{copied ? "Copied" : "Copy"}</span>
      </Button>
      <SyntaxHighlighter
        language={language || "text"}
        style={oneLight}
        customStyle={{
          margin: 0,
          borderRadius: "0.375rem",
          fontSize: "0.85em",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

/**
 * @desc    Render Markdown content as a styled article
 * @param   {{content: string}} props - The Markdown source
 * @returns {JSX.Element} The rendered article
 */
export function MarkdownViewer({ content }: { content: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="reading prose prose-[#6247aa] max-w-none prose-headings:font-serif prose-headings:font-normal prose-a:text-[#6247aa] prose-a:no-underline hover:prose-a:underline"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({
            inline,
            className,
            children,
            ...props
          }: React.HTMLAttributes<HTMLElement> & { inline?: boolean }) {
            const match = /language-(\w+)/.exec(className || "");

            // It's a code block if it has a class like language-xxx, or if it has newline (usually block)
            if (!inline && match) {
              return (
                <CodeBlock
                  code={String(children).replace(/\n$/, "")}
                  language={match[1]}
                />
              );
            }
            if (!inline && !className) {
              // fallback for block with no language
              return (
                <CodeBlock
                  code={String(children).replace(/\n$/, "")}
                  language="text"
                />
              );
            }

            return (
              <code
                className="bg-[#dec9e9] px-1.5 py-0.5 rounded text-[0.85em] font-mono before:content-none after:content-none"
                {...props}
              >
                {children}
              </code>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-6">
                <table className="min-w-full border-collapse border border-[#dec9e9] rounded-lg">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="px-4 py-2 border border-[#dec9e9] bg-[#f8f4fb] text-left font-semibold text-[#6247aa]">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="px-4 py-2 border border-[#dec9e9]">{children}</td>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </motion.article>
  );
}

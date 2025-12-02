"use client";

import { useState } from "react";
import { z } from "zod";
import Image from "next/image";

// Zod schema for AI report
const AIReportSchema = z.object({
  title: z.string(),
  metrics: z
    .array(z.object({ label: z.string(), value: z.string().or(z.number()) }))
    .optional(),
  sections: z
    .array(
      z.object({
        title: z.string(),
        content: z.string().optional(),
        items: z.array(z.string()).optional(),
      })
    )
    .optional(),
});

// Icons
const SendIcon = ({ className = "w-5 h-5", ...props }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const SparkleIcon = ({ className = "w-5 h-5", ...props }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const ChartIcon = ({ className = "w-6 h-6", ...props }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

// Safe AI Report Renderer with Nightwing theme
function SafeAIReportRenderer({ report }) {
  try {
    const validated = AIReportSchema.parse(report);
    return (
      <div className="w-full max-w-4xl mx-auto fade-in">
        <div className="glass-card p-6 md:p-8">
          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold mb-6 gradient-text leading-tight">
            {validated.title}
          </h1>

          {/* Metrics Grid */}
          {validated.metrics && validated.metrics.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
              {validated.metrics.map((m, i) => (
                <div
                  key={i}
                  className="relative group p-4 rounded-xl transition-all duration-300 hover:-translate-y-1"
                  style={{
                    background: 'rgba(14, 165, 233, 0.08)',
                    border: '1px solid rgba(14, 165, 233, 0.2)',
                  }}
                >
                  <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ boxShadow: '0 0 20px rgba(14, 165, 233, 0.2)' }}
                  />
                  <div className="relative">
                    <div className="text-xs uppercase tracking-wider text-slate-400 mb-1.5 font-medium">
                      {m.label}
                    </div>
                    <div className="text-xl md:text-2xl font-bold text-sky-400">
                      {m.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sections */}
          {validated.sections &&
            validated.sections.map((section, i) => (
              <div key={i} className="mb-8 last:mb-0">
                <h2 className="text-lg md:text-xl font-semibold mb-4 text-sky-300 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  {section.title}
                </h2>
                {section.content && (
                  <p className="text-slate-300 leading-relaxed mb-4">
                    {section.content}
                  </p>
                )}
                {section.items && section.items.length > 0 && (
                  <ul className="space-y-2 pl-4">
                    {section.items.map((item, j) => (
                      <li
                        key={j}
                        className="text-slate-300 relative pl-4 before:absolute before:left-0 before:top-2.5 before:w-1.5 before:h-1.5 before:rounded-full before:bg-sky-500/50"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
        </div>
      </div>
    );
  } catch (e) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="glass-card p-6">
          <pre className="text-red-400 text-sm">
            AI output is not valid or safe JSON.
            <br />
            {e.message}
          </pre>
        </div>
      </div>
    );
  }
}

// Loading Animation
function LoadingIndicator() {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="relative">
        <div className="w-8 h-8 rounded-full border-2 border-sky-500/20 border-t-sky-500 animate-spin" />
        <div className="absolute inset-0 w-8 h-8 rounded-full animate-ping bg-sky-500/20" />
      </div>
      <span className="text-slate-400 font-medium">Analyzing...</span>
    </div>
  );
}

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e, options) => {
    e?.preventDefault();

    const messageContent = options?.data?.content || input;
    if (!messageContent.trim()) return;

    const userMessage = {
      role: "user",
      content: messageContent,
      id: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!response.ok) throw new Error("API request failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = {
        role: "assistant",
        content: "",
        id: Date.now() + 1,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          if (line.startsWith("0:")) {
            try {
              const content = JSON.parse(line.slice(2));
              assistantMessage.content += content;
              setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = { ...assistantMessage };
                return newMessages;
              });
            } catch (e) {
              console.error("Parse error:", e, "Line:", line);
            }
          } else if (line.startsWith("error:")) {
            const errorData = JSON.parse(line.slice(6));
            console.error("Stream error:", errorData);
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Error: Failed to get response",
          id: Date.now() + 1,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const examplePrompts = [
    { text: "Analyze boat-lifestyle.com", icon: <ChartIcon /> },
    { text: "Analyze gonoise.com", icon: <ChartIcon /> },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header - Minimal and clean */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-sky-500/10"
        style={{ background: 'rgba(2, 6, 23, 0.9)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 md:h-16">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="relative">
                <Image
                  src="/logo.svg"
                  alt="D2CPulse Logo"
                  width={36}
                  height={36}
                  className="md:w-10 md:h-10"
                  priority
                />
              </div>
              <h1 className="text-lg md:text-xl font-bold gradient-text tracking-tight">
                D2CPulse
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden md:inline text-xs text-slate-500">
                AI-powered D2C intelligence
              </span>
              <a
                href="https://github.com/punyamsingh/d2cpulse"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Messages Container */}
        <div className="flex-1 space-y-6">
          {/* Empty State */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[65vh] text-center px-4">
              {/* Hero Logo - smaller, more elegant */}
              <div className="relative mb-6">
                <Image
                  src="/logo.svg"
                  alt="D2CPulse Logo"
                  width={100}
                  height={100}
                  className="relative z-10"
                />
                <div className="absolute inset-0 blur-2xl bg-sky-500/30 animate-pulse" />
              </div>

              {/* Hero Text - bolder, more impactful */}
              <h2 className="text-4xl md:text-6xl font-extrabold mb-3 tracking-tight">
                <span className="gradient-text">D2CPulse</span>
              </h2>
              <p className="text-slate-400 text-base md:text-lg max-w-md mb-10">
                AI-powered competitive intelligence for Shopify stores
              </p>

              {/* Example Prompts - more prominent, better contrast */}
              <div className="grid sm:grid-cols-2 gap-3 w-full max-w-xl mb-8">
                {examplePrompts.map((example, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.preventDefault();
                      handleSubmit(e, { data: { content: example.text } });
                    }}
                    className="group relative flex items-center gap-3 px-5 py-4 rounded-xl text-left transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02]"
                    style={{
                      background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%)',
                      border: '1px solid rgba(14, 165, 233, 0.25)',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                    }}
                  >
                    <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ 
                        background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)',
                        boxShadow: '0 0 30px rgba(14, 165, 233, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)' 
                      }}
                    />
                    <span className="relative text-sky-400 group-hover:text-sky-300 transition-colors">
                      {example.icon}
                    </span>
                    <span className="relative text-white font-medium group-hover:text-white transition-colors flex-1">
                      {example.text}
                    </span>
                    <span className="relative text-sky-400 group-hover:translate-x-1 transition-transform duration-200">
                      →
                    </span>
                  </button>
                ))}
              </div>

              {/* Feature Pills - larger, better contrast */}
              <div className="flex flex-wrap justify-center gap-2">
                {['AI-Powered', 'Real-time', 'Shopify Expert'].map((feature, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase"
                    style={{
                      background: 'rgba(14, 165, 233, 0.15)',
                      border: '1px solid rgba(14, 165, 233, 0.3)',
                      color: '#7dd3fc',
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`fade-in ${message.role === "user" ? "flex justify-end" : ""}`}
            >
              {message.role === "user" ? (
                <div className="max-w-2xl">
                  <div
                    className="inline-block px-5 py-3 rounded-2xl rounded-tr-md font-medium"
                    style={{
                      background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
                      boxShadow: '0 0 20px rgba(14, 165, 233, 0.3)',
                    }}
                  >
                    {message.content}
                  </div>
                </div>
              ) : (
                (() => {
                  let report = null;
                  try {
                    report = JSON.parse(message.content);
                    return <SafeAIReportRenderer report={report} />;
                  } catch {
                    return (
                      <div className="w-full max-w-4xl mx-auto">
                        <div className="glass-card p-6">
                          <pre className="text-red-400 text-sm whitespace-pre-wrap">
                            AI output is not valid JSON.
                          </pre>
                        </div>
                      </div>
                    );
                  }
                })()
              )}
            </div>
          ))}

          {/* Loading */}
          {isLoading && (
            <div className="fade-in">
              <div className="glass-card inline-block">
                <LoadingIndicator />
              </div>
            </div>
          )}
        </div>

        {/* Input Section - more prominent, better visual hierarchy */}
        <div className="sticky bottom-0 pt-6 pb-8 mt-auto"
          style={{
            background: 'linear-gradient(to top, rgba(2, 6, 23, 1) 0%, rgba(2, 6, 23, 0.98) 60%, transparent 100%)',
          }}>
          <form onSubmit={handleSubmit} className="relative max-w-3xl mx-auto">
            <div
              className="flex items-center gap-2 p-2.5 rounded-2xl transition-all duration-300 focus-within:ring-2 focus-within:ring-sky-500/40"
              style={{
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 15, 31, 0.95) 100%)',
                border: '1px solid rgba(14, 165, 233, 0.25)',
                boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(14, 165, 233, 0.1)',
              }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter a Shopify store URL to analyze..."
                disabled={isLoading}
                className="flex-1 bg-transparent px-4 py-3 text-white placeholder-slate-400 outline-none text-base disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={isLoading || !input?.trim()}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: isLoading || !input?.trim() 
                    ? 'rgba(71, 85, 105, 0.5)'
                    : 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
                  boxShadow: isLoading || !input?.trim()
                    ? 'none'
                    : '0 4px 15px rgba(14, 165, 233, 0.4)',
                }}
              >
                {isLoading ? (
                  <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <>
                    <SendIcon className="w-4 h-4" />
                    <span>Analyze</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-center text-xs text-slate-500 mt-3">
              Try: boat-lifestyle.com, gonoise.com, or any Shopify store
            </p>
          </form>
        </div>
      </main>

      {/* Footer - minimal */}
      <footer className="border-t border-sky-500/5 py-4"
        style={{ background: 'rgba(2, 6, 23, 0.95)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="text-sky-400 font-medium">D2CPulse</span>
              <span>•</span>
              <span>Powered by Neurolink & AI</span>
            </div>
            <p className="text-slate-600">Competitive intelligence for D2C brands</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

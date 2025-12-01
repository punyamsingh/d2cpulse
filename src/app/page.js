"use client";

import { useState } from "react";
import { z } from "zod";
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

function SafeAIReportRenderer({ report }) {
  try {
    const validated = AIReportSchema.parse(report);
    return (
      <div style={{ width: "100%", maxWidth: "100%" }}>
        <div
          style={{
            background: "rgba(30,41,59,0.98)",
            borderRadius: "1.2rem",
            padding: "2.5rem 2rem",
            boxShadow: "0 8px 32px rgba(139,92,246,0.10)",
          }}
        >
          <h1
            style={{
              fontSize: "2.2rem",
              fontWeight: "700",
              marginTop: "0",
              marginBottom: "1.2rem",
              background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              letterSpacing: "-1px",
            }}
          >
            {validated.title}
          </h1>

          {validated.metrics && validated.metrics.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "1.5rem",
                marginBottom: "2rem",
                marginTop: "2rem",
                width: "100%",
              }}
            >
              {validated.metrics.map((m, i) => (
                <div
                  key={i}
                  style={{
                    background: "rgba(139, 92, 246, 0.1)",
                    borderRadius: "0.75rem",
                    padding: "1.5rem",
                    border: "1px solid rgba(139, 92, 246, 0.2)",
                    transition: "all 0.3s ease",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "#a0aec0",
                      marginBottom: "0.5rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      fontWeight: "500",
                    }}
                  >
                    {m.label}
                  </div>
                  <div
                    style={{
                      fontSize: "1.75rem",
                      color: "#a78bfa",
                      fontWeight: "700",
                      lineHeight: "1.2",
                    }}
                  >
                    {m.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {validated.sections &&
            validated.sections.map((section, i) => (
              <div
                key={i}
                style={{ marginBottom: "2.5rem", marginTop: "2rem" }}
              >
                <h2
                  style={{
                    fontSize: "1.7rem",
                    fontWeight: "600",
                    marginTop: "2rem",
                    marginBottom: "1.1rem",
                    background:
                      "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    letterSpacing: "-0.5px",
                  }}
                >
                  {section.title}
                </h2>
                {section.content && (
                  <p
                    style={{
                      marginTop: "1rem",
                      lineHeight: "1.8",
                      color: "#e2e8f0",
                    }}
                  >
                    {section.content}
                  </p>
                )}
                {section.items && section.items.length > 0 && (
                  <ul
                    style={{
                      marginTop: "1rem",
                      paddingLeft: "2rem",
                      color: "#e2e8f0",
                    }}
                  >
                    {section.items.map((item, j) => (
                      <li
                        key={j}
                        style={{ marginTop: "0.4rem", marginBottom: "0.4rem" }}
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
      <div style={{ width: "100%" }}>
        <div
          style={{
            background: "rgba(30,41,59,0.98)",
            borderRadius: "1.2rem",
            padding: "2rem",
          }}
        >
          <pre style={{ color: "#e53e3e" }}>
            AI output is not valid or safe JSON.
            <br />
            {e.message}
          </pre>
        </div>
      </div>
    );
  }
}

// Dedicated agent to render AI report from structured JSON
function AIReportRenderer({ report }) {
  if (!report) return null;
  // Example: expects report = { title, metrics, sections }
  return (
    <div className="ai-report-area">
      <div className="prose">
        <h1>{report.title}</h1>
        {report.metrics && (
          <div style={{ display: "flex", gap: "2rem", marginBottom: "2rem" }}>
            {report.metrics.map((m, i) => (
              <div
                key={i}
                style={{
                  background: "#232336",
                  borderRadius: "1rem",
                  padding: "1rem 2rem",
                }}
              >
                <div style={{ fontSize: "0.9em", color: "#a0aec0" }}>
                  {m.label}
                </div>
                <div
                  style={{
                    fontSize: "2em",
                    color: "#8b5cf6",
                    fontWeight: "bold",
                  }}
                >
                  {m.value}
                </div>
              </div>
            ))}
          </div>
        )}
        {report.sections &&
          report.sections.map((section, i) => (
            <div key={i} style={{ marginBottom: "2rem" }}>
              <h2>{section.title}</h2>
              {section.content && <p>{section.content}</p>}
              {section.items && (
                <ul>
                  {section.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
import Image from "next/image";
import "./page.css";

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

  return (
    <div className="container">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Image
              src="/logo.svg"
              alt="D2CPulse Logo"
              width={80}
              height={80}
              priority
            />
            <div>
              <h1 className="header-title">D2CPulse</h1>
              <p className="header-subtitle">
                AI-powered competitive intelligence for D2C brands
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <main className="main-content">
        {/* Messages */}
        <div className="messages-container">
          {messages.length === 0 && (
            <div className="empty-state">
              <Image
                src="/logo.svg"
                alt="D2CPulse Logo"
                width={200}
                height={200}
                style={{ margin: "0 auto 1rem" }}
              />
              <h2 className="empty-title">Welcome to D2CPulse</h2>
              <p className="empty-subtitle">
                Analyze any Shopify store for competitive intelligence
              </p>

              {/* Example prompts */}
              <div className="example-prompts">
                {[
                  "Analyze pawsomelabs.com",
                  "Analyze gymshark.com",
                  "Compare these two stores",
                  "What's the pricing strategy?",
                ].map((example, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.preventDefault();
                      handleSubmit(e, {
                        data: { content: example },
                      });
                    }}
                    className="example-button"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`message-wrapper ${
                message.role === "user" ? "message-user" : "message-assistant"
              }`}
            >
              <div
                className={`message-bubble ${
                  message.role === "user" ? "bubble-user" : "bubble-assistant"
                }`}
              >
                {message.role === "assistant" ? (
                  (() => {
                    let report = null;
                    try {
                      report = JSON.parse(message.content);
                    } catch {
                      return (
                        <div className="ai-report-area">
                          <div className="prose">
                            <pre style={{ color: "#e53e3e" }}>
                              AI output is not valid JSON.
                            </pre>
                          </div>
                        </div>
                      );
                    }
                    return <SafeAIReportRenderer report={report} />;
                  })()
                ) : (
                  <p>{message.content}</p>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="message-wrapper message-assistant">
              <div className="message-bubble bubble-assistant">
                <div className="loading-container">
                  <div className="spinner"></div>
                  <span>Analyzing...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <div className="input-section">
          <form onSubmit={handleSubmit} className="input-form">
            <div className="input-wrapper">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me to analyze stores or compare them..."
                disabled={isLoading}
                className="input-field"
              />
              <button
                type="submit"
                disabled={isLoading || !input?.trim()}
                className="submit-button"
              >
                {isLoading ? "Analyzing..." : "Send"}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>D2CPulse - Powered by Neurolink & AI</p>
        <p>Competitive intelligence for D2C brands in India</p>
      </footer>
    </div>
  );
}

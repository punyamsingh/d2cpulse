"use client";

import { useState } from "react";
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
          <h1 className="header-title">🔍 D2CPulse</h1>
          <p className="header-subtitle">
            AI-powered competitive intelligence for D2C brands
          </p>
        </div>
      </header>

      {/* Chat Container */}
      <main className="main-content">
        {/* Messages */}
        <div className="messages-container">
          {messages.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
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
                  <div
                    dangerouslySetInnerHTML={{ __html: message.content }}
                    className="prose"
                  />
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

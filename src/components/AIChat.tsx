"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Bot,
  User,
  FileText,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { trackEvent } from "@/lib/lytics";
import { useLytics } from "./LyticsProvider";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { title: string; slug: string; relevance: number }[];
  intent?: string;
  timestamp: Date;
}

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIChat({ isOpen, onClose }: AIChatProps) {
  const { profile } = useLytics();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get user ID for identity tracking
  const userId = profile?.uid;

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);

      // Track chat opened with user identity
      trackEvent(
        "ai_chat_started",
        {
          entry_point: "help_widget",
          _uid: userId,
        },
        "user_ai_interactions"
      );
    }
  }, [isOpen, userId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Track user message with identity
    trackEvent(
      "ai_chat_message",
      {
        message_length: userMessage.content.length,
        session_id: sessionId,
        _uid: userId,
      },
      "user_ai_interactions"
    );

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          sessionId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: `assistant_${Date.now()}`,
          role: "assistant",
          content: data.data.message,
          sources: data.data.sources,
          intent: data.data.intent,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        if (data.data.sessionId) {
          setSessionId(data.data.sessionId);
        }

        // Track AI response with identity
        trackEvent(
          "ai_chat_response",
          {
            intent: data.data.intent,
            confidence: data.data.confidence,
            sources_count: data.data.sources?.length || 0,
            session_id: data.data.sessionId,
            _uid: userId,
          },
          "user_ai_interactions"
        );
      } else {
        throw new Error(data.error || "Failed to get response");
      }
    } catch (error) {
      console.error("Chat error:", error);

      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        role: "assistant",
        content:
          "I apologize, but I encountered an error. Please try again or contact support if the issue persists.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetChat = () => {
    setMessages([]);
    setSessionId(null);

    trackEvent(
      "ai_chat_reset",
      {
        messages_count: messages.length,
        _uid: userId,
      },
      "user_ai_interactions"
    );
  };

  const handleClose = () => {
    trackEvent(
      "ai_chat_ended",
      {
        messages_count: messages.length,
        session_id: sessionId,
        _uid: userId,
      },
      "user_ai_interactions"
    );

    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-surface-200 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-500 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold">AI Support Assistant</h3>
              <p className="text-xs text-primary-100">Powered by your docs</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={resetChat}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Reset conversation"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-50 flex items-center justify-center">
                <Bot className="w-8 h-8 text-primary-500" />
              </div>
              <h4 className="font-medium text-surface-900 mb-2">
                How can I help you today?
              </h4>
              <p className="text-sm text-surface-500 mb-4">
                Ask me anything about our platform
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {["Reset password", "API errors", "Billing help"].map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="px-3 py-1.5 text-sm bg-surface-100 text-surface-700 rounded-full hover:bg-surface-200 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${
                message.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === "user"
                    ? "bg-primary-100 text-primary-600"
                    : "bg-surface-100 text-surface-600"
                }`}
              >
                {message.role === "user" ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>
              <div
                className={`flex-1 ${
                  message.role === "user" ? "text-right" : ""
                }`}
              >
                <div
                  className={`inline-block px-4 py-2 rounded-2xl max-w-[85%] ${
                    message.role === "user"
                      ? "bg-primary-600 text-white rounded-tr-sm"
                      : "bg-surface-100 text-surface-900 rounded-tl-sm"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>

                {/* Sources */}
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-surface-500">
                      Related articles:
                    </p>
                    {message.sources.slice(0, 2).map((source) => (
                      <Link
                        key={source.slug}
                        href={`/docs/${source.slug}`}
                        className="flex items-center gap-2 text-xs text-primary-600 hover:text-primary-700 transition-colors"
                      >
                        <FileText className="w-3 h-3" />
                        {source.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-surface-100 flex items-center justify-center">
                <Bot className="w-4 h-4 text-surface-600" />
              </div>
              <div className="bg-surface-100 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                  <span className="text-sm text-surface-500">Thinking...</span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-surface-200">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question..."
              className="flex-1 px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="p-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-surface-400 mt-2 text-center">
            AI responses are based on our documentation
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Floating trigger button
export function AIChatTrigger({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-full shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-shadow"
    >
      <MessageCircle className="w-5 h-5" />
      <span className="font-medium">AI Support</span>
    </motion.button>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { chat, type ChatMessage, type AIResponse } from "@/lib/ai";

export const maxDuration = 30; // Allow up to 30 seconds

interface ChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
  sessionId?: string;
}

export async function POST(request: NextRequest) {
  console.log("[Chat API] Received request");

  try {
    const body: ChatRequest = await request.json();
    const { message, conversationHistory = [], sessionId } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    console.log("[Chat API] Processing message:", message.slice(0, 50) + "...");
    console.log(
      "[Chat API] Conversation history length:",
      conversationHistory.length
    );

    // Generate AI response
    const response: AIResponse = await chat(message, conversationHistory);

    console.log("[Chat API] Response generated with intent:", response.intent);

    return NextResponse.json({
      success: true,
      data: {
        message: response.message,
        sources: response.sources,
        intent: response.intent,
        confidence: response.confidence,
        sessionId: sessionId || generateSessionId(),
      },
    });
  } catch (error: unknown) {
    console.error("[Chat API] Error:", error);

    // Extract detailed error info
    let errorDetails: unknown = "Unknown error";
    if (error && typeof error === "object") {
      const err = error as Record<string, unknown>;
      if (err.httpResponse && typeof err.httpResponse === "object") {
        const httpResp = err.httpResponse as Record<string, unknown>;
        errorDetails = httpResp.body || httpResp;
      } else {
        errorDetails = err.message || err;
      }
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Check for specific errors
    if (errorMessage.includes("rate limit")) {
      return NextResponse.json(
        { error: "Too many requests. Please try again in a moment." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to generate response. Please try again.",
        details: errorMessage,
        fullError: errorDetails,
      },
      { status: 500 }
    );
  }
}

// Generate a random session ID
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// GET endpoint for health check
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/ai/chat",
    method: "POST",
    description: "AI-powered troubleshooting chat",
    body: {
      message: "string (required)",
      conversationHistory: "ChatMessage[] (optional)",
      sessionId: "string (optional)",
    },
    example: {
      message: "How do I reset my password?",
    },
  });
}

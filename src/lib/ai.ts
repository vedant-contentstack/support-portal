import { Pinecone } from "@pinecone-database/pinecone";
import { HfInference } from "@huggingface/inference";

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

// Initialize Hugging Face client
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// Constants
const EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"; // 384 dimensions, free
const CHAT_MODEL = "meta-llama/Llama-3.2-3B-Instruct"; // Free on HF
const INDEX_NAME = "support-docs";
const NAMESPACE = "articles";
const EMBEDDING_DIMENSION = 384; // MiniLM dimension

// Types
export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    title: string;
    slug: string;
    category?: string;
    contentstack_uid: string;
  };
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIResponse {
  message: string;
  sources: {
    title: string;
    slug: string;
    relevance: number;
  }[];
  intent?: string;
  confidence: number;
}

/**
 * Generate embeddings using Hugging Face SDK
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const result = await hf.featureExtraction({
    model: EMBEDDING_MODEL,
    inputs: text,
  });

  // HF returns nested array, flatten if needed
  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result[0] as number[];
  }
  return result as number[];
}

/**
 * Store document embeddings in Pinecone
 */
export async function storeDocumentEmbedding(
  doc: DocumentChunk
): Promise<void> {
  const index = pinecone.index(INDEX_NAME);

  const embedding = await generateEmbedding(doc.content);

  await index.namespace(NAMESPACE).upsert([
    {
      id: doc.id,
      values: embedding,
      metadata: {
        title: doc.metadata.title,
        slug: doc.metadata.slug,
        category: doc.metadata.category || "",
        contentstack_uid: doc.metadata.contentstack_uid,
        content: doc.content.slice(0, 1000), // Store truncated content for context
      },
    },
  ]);

  console.log(`[AI] Stored embedding for: ${doc.metadata.title}`);
}

/**
 * Search for relevant documents using semantic search
 */
export async function searchDocuments(
  query: string,
  topK: number = 5
): Promise<
  {
    id: string;
    score: number;
    metadata: Record<string, unknown>;
  }[]
> {
  const index = pinecone.index(INDEX_NAME);

  const queryEmbedding = await generateEmbedding(query);

  const results = await index.namespace(NAMESPACE).query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
  });

  // Map results to ensure score is always a number
  return (results.matches || []).map((match) => ({
    id: match.id,
    score: match.score ?? 0,
    metadata: (match.metadata as Record<string, unknown>) || {},
  }));
}

/**
 * Generate chat response using Hugging Face SDK
 */
async function generateChatResponse(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  try {
    // Use chatCompletion for conversational models
    const result = await hf.chatCompletion({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return (
      result.choices[0]?.message?.content ||
      "I apologize, I couldn't generate a response."
    );
  } catch (error: unknown) {
    // Log full error details
    console.error(
      "[AI] Chat error full details:",
      JSON.stringify(error, null, 2)
    );

    // Try to extract the actual error message
    if (error && typeof error === "object") {
      const err = error as Record<string, unknown>;
      if (err.httpResponse && typeof err.httpResponse === "object") {
        const httpResp = err.httpResponse as Record<string, unknown>;
        console.error(
          "[AI] HTTP Response body:",
          JSON.stringify(httpResp.body, null, 2)
        );
      }
    }

    throw error;
  }
}

/**
 * Detect user intent from their message
 */
export async function detectIntent(message: string): Promise<{
  intent: string;
  confidence: number;
  topics: string[];
}> {
  // Simple keyword-based intent detection (faster than LLM)
  const intents: Record<string, string[]> = {
    authentication: [
      "login",
      "password",
      "2fa",
      "auth",
      "sign in",
      "locked",
      "access",
    ],
    billing: [
      "invoice",
      "payment",
      "charge",
      "subscription",
      "refund",
      "billing",
      "price",
    ],
    api: [
      "api",
      "endpoint",
      "request",
      "response",
      "401",
      "403",
      "500",
      "error code",
    ],
    integration: ["integrate", "webhook", "connect", "setup", "configure"],
    account: ["account", "profile", "settings", "email", "name", "delete"],
    troubleshooting: [
      "not working",
      "error",
      "issue",
      "problem",
      "help",
      "broken",
      "fix",
    ],
  };

  const messageLower = message.toLowerCase();
  const topics: string[] = [];
  let detectedIntent = "general";
  let maxMatches = 0;

  for (const [intent, keywords] of Object.entries(intents)) {
    const matches = keywords.filter((kw) => messageLower.includes(kw));
    if (matches.length > maxMatches) {
      maxMatches = matches.length;
      detectedIntent = intent;
      topics.push(...matches);
    }
  }

  return {
    intent: detectedIntent,
    confidence: Math.min(maxMatches * 0.3 + 0.4, 1),
    topics: Array.from(new Set(topics)),
  };
}

/**
 * Generate AI response using RAG (Retrieval Augmented Generation)
 */
export async function generateAIResponse(
  userMessage: string,
  conversationHistory: ChatMessage[],
  relevantDocs: { content: string; title: string; slug: string }[]
): Promise<AIResponse> {
  // Build context from relevant documents
  const context = relevantDocs
    .map((doc) => `### ${doc.title}\n${doc.content}`)
    .join("\n\n---\n\n");

  // Build system prompt
  const systemPrompt = `You are a helpful support assistant for a customer support portal.
Your job is to help users troubleshoot issues and find answers.

IMPORTANT RULES:
1. ONLY use information from the provided documentation context
2. If the answer isn't in the context, say "I don't have information about that in our documentation"
3. Be conversational and helpful
4. Ask clarifying questions if the user's issue is unclear
5. Keep responses concise but complete

DOCUMENTATION CONTEXT:
${context}`;

  // Format conversation history into the user message if needed
  let fullUserMessage = userMessage;
  if (conversationHistory.length > 0) {
    const historyText = conversationHistory
      .map(
        (msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
      )
      .join("\n");
    fullUserMessage = `Previous conversation:\n${historyText}\n\nCurrent question: ${userMessage}`;
  }

  const aiMessage = await generateChatResponse(systemPrompt, fullUserMessage);

  // Detect intent for tracking
  const intentResult = await detectIntent(userMessage);

  return {
    message: aiMessage.trim(),
    sources: relevantDocs.map((doc, index) => ({
      title: doc.title,
      slug: doc.slug,
      relevance: 1 - index * 0.1,
    })),
    intent: intentResult.intent,
    confidence: intentResult.confidence,
  };
}

/**
 * Main chat function - orchestrates the full AI response
 */
export async function chat(
  userMessage: string,
  conversationHistory: ChatMessage[] = []
): Promise<AIResponse> {
  console.log("[AI] Processing message:", userMessage);

  // 1. Search for relevant documents
  const searchResults = await searchDocuments(userMessage, 3);
  console.log("[AI] Found", searchResults.length, "relevant documents");

  // 2. Extract document content for context
  const relevantDocs = searchResults.map((result) => ({
    content: (result.metadata?.content as string) || "",
    title: (result.metadata?.title as string) || "Unknown",
    slug: (result.metadata?.slug as string) || "",
  }));

  // 3. Generate AI response
  const response = await generateAIResponse(
    userMessage,
    conversationHistory,
    relevantDocs
  );

  console.log("[AI] Generated response with intent:", response.intent);

  return response;
}

/**
 * Check if Pinecone index exists, create if not
 */
export async function ensureIndexExists(): Promise<void> {
  const indexes = await pinecone.listIndexes();

  const indexExists = indexes.indexes?.some((idx) => idx.name === INDEX_NAME);

  if (!indexExists) {
    console.log("[AI] Creating Pinecone index:", INDEX_NAME);
    await pinecone.createIndex({
      name: INDEX_NAME,
      dimension: EMBEDDING_DIMENSION, // 384 for MiniLM
      metric: "cosine",
      spec: {
        serverless: {
          cloud: "aws",
          region: "us-east-1",
        },
      },
    });
    // Wait for index to be ready
    console.log("[AI] Waiting for index to be ready...");
    await new Promise((resolve) => setTimeout(resolve, 30000));
    console.log("[AI] Index created successfully");
  } else {
    console.log("[AI] Index already exists:", INDEX_NAME);
  }
}

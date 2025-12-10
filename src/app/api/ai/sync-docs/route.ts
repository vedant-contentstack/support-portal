import { NextResponse } from "next/server";
import { getArticles } from "@/lib/contentstack";
import {
  ensureIndexExists,
  storeDocumentEmbedding,
  type DocumentChunk,
} from "@/lib/ai";

export const maxDuration = 60; // Allow up to 60 seconds for this route

export async function POST() {
  console.log("[Sync] Starting document sync to Pinecone...");

  try {
    // 1. Ensure Pinecone index exists
    console.log("[Sync] Step 1: Ensuring Pinecone index exists...");
    await ensureIndexExists();

    // 2. Fetch all articles from Contentstack
    console.log("[Sync] Step 2: Fetching articles from Contentstack...");
    const { articles, total } = await getArticles(100, 0); // Get up to 100 articles
    console.log(`[Sync] Found ${total} articles`);

    if (articles.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No articles found to sync",
        synced: 0,
      });
    }

    // 3. Process each article
    console.log("[Sync] Step 3: Processing and storing embeddings...");
    let synced = 0;
    const errors: string[] = [];

    for (const article of articles) {
      try {
        // Get category name
        let categoryName = "";
        if (Array.isArray(article.category) && article.category[0]) {
          const cat = article.category[0];
          if (typeof cat === "object" && "title" in cat) {
            categoryName = cat.title;
          }
        }

        // Combine title, excerpt, and content for embedding
        const content = [
          article.title,
          article.excerpt || "",
          // Strip HTML from content if it exists
          article.content
            ? article.content.replace(/<[^>]*>/g, " ").slice(0, 2000)
            : "",
        ]
          .filter(Boolean)
          .join("\n\n");

        const doc: DocumentChunk = {
          id: article.uid,
          content,
          metadata: {
            title: article.title,
            slug: article.slug,
            category: categoryName,
            contentstack_uid: article.uid,
          },
        };

        await storeDocumentEmbedding(doc);
        synced++;
        console.log(`[Sync] ✓ Synced: ${article.title}`);

        // Small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[Sync] ✗ Error syncing ${article.title}:`, errorMsg);
        errors.push(`${article.title}: ${errorMsg}`);
      }
    }

    console.log(
      `[Sync] Complete! Synced ${synced}/${articles.length} articles`
    );

    return NextResponse.json({
      success: true,
      message: `Synced ${synced} articles to Pinecone`,
      synced,
      total: articles.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("[Sync] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check sync status
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/ai/sync-docs",
    method: "POST",
    description: "Sync all Contentstack articles to Pinecone vector database",
    usage: "curl -X POST http://localhost:3000/api/ai/sync-docs",
  });
}

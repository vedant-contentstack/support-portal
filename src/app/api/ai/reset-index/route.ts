import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";

const INDEX_NAME = "support-docs";

export async function POST() {
  console.log("[Reset] Deleting and recreating Pinecone index...");

  try {
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    // Delete existing index
    try {
      console.log("[Reset] Deleting index:", INDEX_NAME);
      await pinecone.deleteIndex(INDEX_NAME);
      console.log("[Reset] Index deleted");
      
      // Wait for deletion to complete
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (e) {
      console.log("[Reset] Index may not exist, continuing...", e);
    }

    // Create new index with correct dimension
    console.log("[Reset] Creating new index with dimension 384...");
    await pinecone.createIndex({
      name: INDEX_NAME,
      dimension: 384, // MiniLM dimension
      metric: "cosine",
      spec: {
        serverless: {
          cloud: "aws",
          region: "us-east-1",
        },
      },
    });

    // Wait for index to be ready
    console.log("[Reset] Waiting for index to be ready...");
    await new Promise((resolve) => setTimeout(resolve, 30000));

    return NextResponse.json({
      success: true,
      message: "Index recreated with dimension 384",
    });
  } catch (error) {
    console.error("[Reset] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


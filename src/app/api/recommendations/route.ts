import { NextRequest, NextResponse } from "next/server";

interface LyticsRecommendation {
  contentstack_uid: string;
  title: string;
  body: string;
  url: string;
  topics: string[];
  topic_relevances: Record<string, number>;
  visited: boolean;
  confidence: number;
}

interface LyticsResponse {
  data: LyticsRecommendation[];
  message: string;
  status: number;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userUid = searchParams.get("uid");
  const limit = searchParams.get("limit") || "5";

  if (!userUid) {
    return NextResponse.json(
      { error: "Missing uid parameter" },
      { status: 400 }
    );
  }

  const accountId = process.env.NEXT_PUBLIC_LYTICS_ACCOUNT_ID;

  if (!accountId) {
    return NextResponse.json(
      { error: "Lytics account ID not configured" },
      { status: 500 }
    );
  }

  try {
    const url = `https://api.lytics.io/api/content/recommend/${accountId}/user/_uid/${userUid}?limit=${limit}`;
    console.log("[API/recommendations] Fetching from Lytics:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[API/recommendations] Lytics API error:", response.status, errorText);
      return NextResponse.json(
        { error: "Failed to fetch recommendations", details: errorText },
        { status: response.status }
      );
    }

    const data: LyticsResponse = await response.json();
    console.log("[API/recommendations] Received", data.data?.length || 0, "recommendations");

    return NextResponse.json(data);
  } catch (error) {
    console.error("[API/recommendations] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


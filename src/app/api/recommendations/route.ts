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
  const token = process.env.NEXT_PUBLIC_LYTICS_TOKEN;

  if (!accountId) {
    return NextResponse.json(
      { error: "Lytics account ID not configured" },
      { status: 500 }
    );
  }

  if (!token) {
    return NextResponse.json(
      { error: "Lytics token not configured" },
      { status: 500 }
    );
  }

  try {
    const url = `https://api.lytics.io/api/content/recommend/user/_uids/${userUid}?account_id=${accountId}`;
    console.log("[API/recommendations] Fetching from Lytics:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "[API/recommendations] Lytics API error:",
        response.status,
        errorText
      );
      return NextResponse.json(
        { error: "Failed to fetch recommendations", details: errorText },
        { status: response.status }
      );
    }

    const data: LyticsResponse = await response.json();
    console.log(
      "[API/recommendations] Received",
      data.data?.length || 0,
      "recommendations"
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("[API/recommendations] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

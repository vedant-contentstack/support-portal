// Lytics Customer Data Platform Integration
// Handles user tracking, audience segmentation, and personalization

declare global {
  interface Window {
    jstag: LyticsJSTag;
    _ltk?: {
      Recommender?: new () => LyticsRecommender;
    };
  }
}

interface LyticsJSTag {
  send: (event: string, data?: Record<string, unknown>) => void;
  identify: (traits: Record<string, unknown>) => void;
  getEntity: (callback: (entity: LyticsEntity) => void) => void;
  pageView: (data?: Record<string, unknown>) => void;
  on: (event: string, callback: () => void) => void;
  config: Record<string, unknown>;
}

interface LyticsUser {
  _id?: string;
  _uid?: string;
  email?: string;
  name?: string;
  interests?: string[];
  segments?: string[]; // Lytics uses 'segments'
  audience_segments?: string[]; // Fallback
  content_affinities?: string[];
  affinities?: string[]; // Alternative field name
  search_history?: string[];
  ticket_categories?: string[];
  engagement_score?: number;
  visit_count?: number;
  last_visit?: string;
}

interface LyticsEntity {
  // Lytics returns user at entity.user (not entity.data.user)
  user?: LyticsUser;
  data?: {
    user?: LyticsUser;
  };
  experiences?: unknown[];
  errors?: unknown;
}

interface LyticsRecommender {
  fetch: (options: {
    contentsegment?: string;
    limit?: number;
  }) => Promise<LyticsRecommendation[]>;
}

export interface LyticsRecommendation {
  url: string;
  title: string;
  description?: string;
  primary_image?: string;
  topics?: string[];
}

// User profile data from Lytics
export interface UserProfile {
  uid?: string;
  email?: string;
  name?: string;
  interests: string[];
  audienceSegments: string[];
  contentAffinities: string[];
  searchHistory: string[];
  ticketCategories: string[];
  engagementScore: number;
  visitCount: number;
  lastVisit?: string;
}

// Initialize Lytics tag (Version 3)
// This follows the official Lytics tracking tag pattern
export function initLytics(accountId: string): void {
  if (typeof window === "undefined") return;

  // Check if already initialized
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window.jstag as any)?.config) return;

  // Lytics JavaScript Tag Version 3 - Exact implementation from Lytics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jstag: any = window.jstag || (window.jstag = {} as LyticsJSTag);
  const queue: Array<[string, unknown[]]> = [];

  function stubMethod(methodName: string) {
    jstag[methodName] = function (...args: unknown[]) {
      queue.push([methodName, args]);
    };
  }

  // Stub all methods before script loads
  stubMethod("send");
  stubMethod("mock");
  stubMethod("identify");
  stubMethod("pageView");
  stubMethod("unblock");
  stubMethod("getid");
  stubMethod("setid");
  stubMethod("loadEntity");
  stubMethod("getEntity");
  stubMethod("on");
  stubMethod("once");
  stubMethod("call");

  jstag.loadScript = function (
    src: string,
    onload?: () => void,
    onerror?: () => void
  ) {
    const script = document.createElement("script");
    script.async = true;
    script.src = src;
    script.onload = onload || null;
    script.onerror = onerror || null;
    const firstScript = document.getElementsByTagName("script")[0];
    const parent =
      (firstScript && firstScript.parentNode) || document.head || document.body;
    const insertPoint = firstScript || parent.lastChild;
    if (insertPoint != null) {
      parent.insertBefore(script, insertPoint);
    } else {
      parent.appendChild(script);
    }
    return jstag;
  };

  // Store reference to stub init
  const stubInit = function (config: { src: string }) {
    jstag.config = config;
    jstag.loadScript(config.src, function () {
      // Check if init was replaced by loaded script
      if (jstag.init === stubInit) {
        console.error("Lytics: Script load error!");
        return;
      }
      // Call the real init from loaded script
      jstag.init(jstag.config);
      // Replay queued calls
      for (let i = 0; i < queue.length; i++) {
        const methodName = queue[i][0];
        const args = queue[i][1];
        if (typeof jstag[methodName] === "function") {
          jstag[methodName].apply(jstag, args);
        }
      }
      console.log("Lytics initialized successfully");
    });
    return jstag;
  };

  jstag.init = stubInit;

  // Initialize with the account ID
  jstag.init({
    src: `https://c.lytics.io/api/tag/${accountId}/latest.min.js`,
  });

  // Listen for Pathfora to be ready and experiences to be published
  jstag.on("pathfora.publish.done", function () {
    console.log("Pathfora experiences published and ready");
  });

  // Send initial page view
  jstag.pageView();
}

// Track and get visit count from localStorage
function getAndIncrementVisitCount(): number {
  if (typeof window === "undefined") return 1;

  const VISIT_KEY = "lytics_visit_count";
  const LAST_VISIT_KEY = "lytics_last_visit";
  const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes

  const now = Date.now();
  const lastVisit = parseInt(localStorage.getItem(LAST_VISIT_KEY) || "0", 10);
  let visitCount = parseInt(localStorage.getItem(VISIT_KEY) || "0", 10);

  // If more than 30 min since last activity, count as new visit
  if (now - lastVisit > SESSION_TIMEOUT) {
    visitCount += 1;
    localStorage.setItem(VISIT_KEY, String(visitCount));
  }

  // Update last visit timestamp
  localStorage.setItem(LAST_VISIT_KEY, String(now));

  return visitCount || 1;
}

// Get current visit count without incrementing
export function getVisitCount(): number {
  if (typeof window === "undefined") return 1;
  const count = parseInt(localStorage.getItem("lytics_visit_count") || "1", 10);
  return Number.isNaN(count) ? 1 : count;
}

// Track page view with metadata
// Includes support for Lytics content affinity fields
export function trackPageView(metadata?: Record<string, unknown>): void {
  if (typeof window === "undefined" || !window.jstag) return;

  const visitCount = Number(getAndIncrementVisitCount());

  const pageData: Record<string, unknown> = {
    ...metadata,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    path: window.location.pathname,
    referrer: document.referrer || undefined,
    visit_count: Number(visitCount),
  };

  // Send topic as a single string value (use first topic if array)
  if (
    Array.isArray(pageData.content_topics) &&
    pageData.content_topics.length > 0
  ) {
    pageData.topic = pageData.content_topics[0] as string;
    delete pageData.content_topics;
  }

  window.jstag.pageView(pageData);
}

// Track custom events
// Stream name is the first param, event name goes in body as _e
export function trackEvent(
  eventName: string,
  data?: Record<string, unknown>,
  streamName: string = "default"
): void {
  if (typeof window === "undefined" || !window.jstag) return;

  window.jstag.send(streamName, {
    _e: eventName,
    ...data,
    timestamp: new Date().toISOString(),
  });
}

// Track search queries for personalization
export function trackSearch(query: string, resultsCount: number): void {
  trackEvent("search", {
    query,
    results_count: resultsCount,
    search_type: "support_docs",
  });
}

// Track article views for content affinity
export function trackArticleView(article: {
  uid: string;
  title: string;
  category: string;
  tags: string[];
}): void {
  trackEvent("article_view", {
    article_uid: article.uid,
    article_title: article.title,
    category: article.category,
    tags: article.tags,
    content_type: "support_article",
  });
}

// Track helpful/not helpful feedback
export function trackArticleFeedback(
  articleUid: string,
  isHelpful: boolean
): void {
  trackEvent("article_feedback", {
    article_uid: articleUid,
    is_helpful: isHelpful,
  });
}

// Track ticket submission (includes user info)
export function trackTicketSubmission(ticket: {
  category: string;
  priority: string;
  subject: string;
  email: string;
  name: string;
}): void {
  trackEvent("ticket_submitted", {
    ticket_category: ticket.category,
    ticket_priority: ticket.priority,
    ticket_subject: ticket.subject,
    email: ticket.email,
    name: ticket.name,
  });
}

// Identify user (after form submission, login, etc.)
export function identifyUser(traits: {
  email: string;
  name?: string;
  company?: string;
}): void {
  if (typeof window === "undefined" || !window.jstag) return;

  window.jstag.identify({
    email: traits.email,
    name: traits.name,
    company: traits.company,
    identified_at: new Date().toISOString(),
  });
}

// Get current user profile from Lytics
export function getUserProfile(): Promise<UserProfile> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.jstag) {
      console.log("[Lytics] No jstag, returning default profile");
      resolve(getDefaultProfile());
      return;
    }

    console.log("[Lytics] Calling jstag.getEntity...");

    // Try direct call first (some versions return data directly)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const directResult = (window.jstag as any).getEntity();
    console.log("[Lytics] getEntity direct result:", directResult);

    // Structure is: result.data.user (not result.user)
    const user = directResult?.data?.user || directResult?.user;

    if (user && (user._uid || user._id)) {
      console.log("[Lytics] User data from direct call:", user);
      console.log("[Lytics] User segments:", user.segments);

      const segments = user.segments || [];

      resolve({
        uid: user._uid || user._id,
        email: user.email,
        name: user.name,
        interests: user.interests || [],
        audienceSegments: segments,
        contentAffinities: user.content_affinities || user.affinities || [],
        searchHistory: user.search_history || [],
        ticketCategories: user.ticket_categories || [],
        engagementScore: user.engagement_score || 0,
        visitCount: user.visit_count || getVisitCount(),
        lastVisit: user.last_visit,
      });
      return;
    }

    console.log("[Lytics] No user data in direct result, trying callback...");

    // Fallback: try callback pattern with timeout
    const timeout = setTimeout(() => {
      console.log(
        "[Lytics] getEntity callback timeout, returning default profile"
      );
      resolve(getDefaultProfile());
    }, 2000);

    window.jstag.getEntity((entity: LyticsEntity) => {
      clearTimeout(timeout);
      console.log("[Lytics] getEntity callback received:", entity);

      const user = entity?.user;

      if (user) {
        console.log("[Lytics] User data found:", user);
        const segments = user.segments || [];

        resolve({
          uid: user._uid || user._id,
          email: user.email,
          name: user.name,
          interests: user.interests || [],
          audienceSegments: segments,
          contentAffinities: user.content_affinities || user.affinities || [],
          searchHistory: user.search_history || [],
          ticketCategories: user.ticket_categories || [],
          engagementScore: user.engagement_score || 0,
          visitCount: user.visit_count || getVisitCount(),
          lastVisit: user.last_visit,
        });
      } else {
        console.log("[Lytics] No user data, returning default profile");
        resolve(getDefaultProfile());
      }
    });
  });
}

function getDefaultProfile(): UserProfile {
  return {
    interests: [],
    audienceSegments: ["new_visitor"],
    contentAffinities: [],
    searchHistory: [],
    ticketCategories: [],
    engagementScore: 0,
    visitCount: getVisitCount(),
  };
}

// Get content recommendations from Lytics
export async function getRecommendations(
  contentSegment?: string,
  limit = 5
): Promise<LyticsRecommendation[]> {
  if (typeof window === "undefined" || !window._ltk?.Recommender) {
    return [];
  }

  try {
    const recommender = new window._ltk.Recommender();
    const recommendations = await recommender.fetch({
      contentsegment: contentSegment,
      limit,
    });
    return recommendations;
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return [];
  }
}

// Lytics Content Recommendation API response types
export interface LyticsContentRecommendation {
  contentstack_uid: string;
  title: string;
  body: string;
  url: string;
  topics: string[];
  topic_relevances: Record<string, number>;
  visited: boolean;
  confidence: number;
}

interface LyticsRecommendationResponse {
  data: LyticsContentRecommendation[];
  message: string;
  status: number;
}

// Fetch personalized content recommendations from Lytics API (via server proxy)
export async function fetchLyticsRecommendations(
  userUid: string,
  limit = 5
): Promise<LyticsContentRecommendation[]> {
  if (!userUid) {
    console.log("[Lytics] Missing userUid for recommendations");
    return [];
  }

  try {
    // Use our API route to avoid CORS issues
    const url = `/api/recommendations?uid=${encodeURIComponent(
      userUid
    )}&limit=${limit}`;
    console.log("[Lytics] Fetching recommendations from:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("[Lytics] Recommendation API error:", response.status);
      return [];
    }

    const data: LyticsRecommendationResponse = await response.json();
    console.log("[Lytics] Recommendations received:", data.data?.length || 0);

    return data.data || [];
  } catch (error) {
    console.error("[Lytics] Error fetching recommendations:", error);
    return [];
  }
}

// Get user's top topic affinities from recommendations
export async function getUserTopicAffinities(
  userUid: string
): Promise<Record<string, number>> {
  const recommendations = await fetchLyticsRecommendations(userUid, 10);

  // Aggregate topic relevances across all recommendations
  const topicScores: Record<string, number[]> = {};

  for (const rec of recommendations) {
    for (const [topic, score] of Object.entries(rec.topic_relevances)) {
      if (!topicScores[topic]) {
        topicScores[topic] = [];
      }
      topicScores[topic].push(score);
    }
  }

  // Average the scores for each topic
  const affinities: Record<string, number> = {};
  for (const [topic, scores] of Object.entries(topicScores)) {
    affinities[topic] = scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  console.log("[Lytics] User topic affinities:", affinities);
  return affinities;
}

// Audience segment definitions for Contentstack Personalize integration
export const AUDIENCE_SEGMENTS = {
  NEW_VISITOR: "new_visitor",
  RETURNING_USER: "returning_user",
  POWER_USER: "power_user",
  BILLING_INTERESTED: "billing_interested",
  TECHNICAL_USER: "technical_user",
  INTEGRATION_SEEKER: "integration_seeker",
  ACCOUNT_MANAGEMENT: "account_management",
  FRUSTRATED_USER: "frustrated_user", // High ticket count, low satisfaction
  ENGAGED_LEARNER: "engaged_learner", // High article reads
} as const;

// Determine primary audience segment
export function getPrimarySegment(profile: UserProfile): string {
  // Logic to determine primary segment based on user behavior
  if (profile.visitCount === 1) return AUDIENCE_SEGMENTS.NEW_VISITOR;
  if (profile.engagementScore > 80) return AUDIENCE_SEGMENTS.POWER_USER;
  if (profile.contentAffinities.includes("billing"))
    return AUDIENCE_SEGMENTS.BILLING_INTERESTED;
  if (
    profile.contentAffinities.includes("api") ||
    profile.contentAffinities.includes("integration")
  ) {
    return AUDIENCE_SEGMENTS.TECHNICAL_USER;
  }
  if (profile.ticketCategories.length > 3)
    return AUDIENCE_SEGMENTS.FRUSTRATED_USER;
  if (profile.interests.length > 5) return AUDIENCE_SEGMENTS.ENGAGED_LEARNER;

  return AUDIENCE_SEGMENTS.RETURNING_USER;
}

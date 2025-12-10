import Contentstack from "contentstack";

// Initialize Contentstack SDK
const Stack = Contentstack.Stack({
  api_key: process.env.NEXT_PUBLIC_CONTENTSTACK_API_KEY || "",
  delivery_token: process.env.NEXT_PUBLIC_CONTENTSTACK_DELIVERY_TOKEN || "",
  environment: process.env.NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT || "production",
  region:
    process.env.NEXT_PUBLIC_CONTENTSTACK_REGION === "eu"
      ? Contentstack.Region.EU
      : Contentstack.Region.US,
});

// ============================================================================
// Content Types
// ============================================================================

export interface Article {
  uid: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  // Category is returned as an array from Contentstack reference fields
  category: Array<Category | { uid: string }>;
  article_tags: string[];
  featured_image?: {
    url: string;
    title: string;
  };
  created_at: string;
  updated_at: string;
  reading_time: number;
  helpful_count: number;
  views: number;
  featured: boolean;
}

export interface Category {
  uid: string;
  title: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  order: number;
}

export interface SupportTicket {
  uid?: string;
  ticket_id: string;
  subject: string;
  description: string;
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  customer_email: string;
  customer_name: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  created_at?: string;
}

export interface PersonalizedContent {
  uid: string;
  title: string;
  content_type: "article" | "announcement" | "tip";
  audience_segment: string;
  content: string;
  cta_text?: string;
  cta_url?: string;
}

export interface HeroContent {
  uid: string;
  segment: string;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_url: string;
}

export interface TicketCategory {
  uid: string;
  category_id: string;
  label: string;
  description: string;
  suggested_articles: Article[];
}

export interface BannerContent {
  uid: string;
  title: string;
  message: string;
  cta_text: string;
  cta_url: string;
  icon: string;
  bg_color: string;
  text_color: string;
  dismissible: boolean;
}

export interface HelpWidgetContent {
  uid: string;
  title: string;
  subtitle: string;
  button_text: string;
  help_options: {
    icon: string;
    label: string;
    description: string;
    url: string;
  }[];
  show_widget: boolean;
}

// ============================================================================
// Personalized Entry Fetching (with variant aliases)
// ============================================================================

/**
 * Fetch a personalized entry using variant aliases from Personalize Edge SDK
 * The variant aliases tell Contentstack which variant to return
 * @param contentType - The content type UID
 * @param variantAliases - Array of variant aliases from sdk.getVariantAliases()
 */
export async function getPersonalizedEntry<T>(
  contentType: string,
  variantAliases: string[]
): Promise<T | null> {
  try {
    const query = Stack.ContentType(contentType).Query();

    // Add variant aliases header for personalization
    // The SDK handles this via the 'x-cs-variant-uid' header
    if (variantAliases.length > 0) {
      // Pass variant aliases as a custom header or query param
      // Contentstack uses these to return the correct variant
      query.addParam("include_variant", true);
      query.addParam("variant_aliases", variantAliases.join(","));
    }

    const result = await query.toJSON().find();
    const entries = result[0] as T[];

    return entries?.[0] || null;
  } catch (error) {
    console.error(`Error fetching personalized ${contentType}:`, error);
    return null;
  }
}

/**
 * Fetch personalized banner content using variant aliases
 * Docs: https://www.contentstack.com/docs/developers/apis/content-delivery-api#get-all-entry-variants
 */
export async function getPersonalizedBanner(
  variantAliases: string[]
): Promise<BannerContent | null> {
  console.log("[Contentstack] getPersonalizedBanner called");
  console.log("[Contentstack] Variant aliases:", variantAliases);

  const apiKey = process.env.NEXT_PUBLIC_CONTENTSTACK_API_KEY || "";
  const deliveryToken =
    process.env.NEXT_PUBLIC_CONTENTSTACK_DELIVERY_TOKEN || "";
  const environment =
    process.env.NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT || "production";
  const region = process.env.NEXT_PUBLIC_CONTENTSTACK_REGION || "us";

  // Determine base URL based on region
  const baseUrl =
    region === "eu"
      ? "https://eu-cdn.contentstack.com"
      : "https://cdn.contentstack.com";

  try {
    // Build URL with variant aliases
    // According to docs: /v3/content_types/{content_type_uid}/entries?include_variant=true
    let url = `${baseUrl}/v3/content_types/banner/entries?environment=${environment}`;

    // Add variant aliases header for personalization
    const headers: Record<string, string> = {
      api_key: apiKey,
      access_token: deliveryToken,
      "Content-Type": "application/json",
    };

    // Pass variant aliases via x-cs-variant-uid header
    if (variantAliases.length > 0) {
      headers["x-cs-variant-uid"] = variantAliases.join(",");
      console.log(
        "[Contentstack] Using x-cs-variant-uid header:",
        variantAliases.join(",")
      );
    }

    console.log("[Contentstack] Fetching from:", url);
    console.log("[Contentstack] Headers:", JSON.stringify(headers, null, 2));

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Contentstack] API error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log("[Contentstack] Raw response:", JSON.stringify(data, null, 2));

    const entries = data.entries as BannerContent[];
    console.log("[Contentstack] Entries found:", entries?.length || 0);

    if (entries && entries.length > 0) {
      console.log("[Contentstack] Returning first banner:", entries[0]);
      return entries[0];
    }

    return null;
  } catch (error) {
    console.error("[Contentstack] Error fetching personalized banner:", error);
    return null;
  }
}

// Fetch help widget content with personalization
export async function getHelpWidget(
  variantAliases: string[]
): Promise<HelpWidgetContent | null> {
  console.log("[Contentstack] getHelpWidget called");
  console.log("[Contentstack] Variant aliases:", variantAliases);

  const apiKey = process.env.NEXT_PUBLIC_CONTENTSTACK_API_KEY || "";
  const deliveryToken =
    process.env.NEXT_PUBLIC_CONTENTSTACK_DELIVERY_TOKEN || "";
  const environment =
    process.env.NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT || "production";
  const region = process.env.NEXT_PUBLIC_CONTENTSTACK_REGION || "us";

  const baseUrl =
    region === "eu"
      ? "https://eu-cdn.contentstack.com"
      : "https://cdn.contentstack.com";

  try {
    const url = `${baseUrl}/v3/content_types/help_widget/entries?environment=${environment}`;

    const headers: Record<string, string> = {
      api_key: apiKey,
      access_token: deliveryToken,
      "Content-Type": "application/json",
    };

    if (variantAliases.length > 0) {
      headers["x-cs-variant-uid"] = variantAliases.join(",");
      console.log(
        "[HelpWidget] Using x-cs-variant-uid header:",
        variantAliases.join(",")
      );
    }

    console.log("[HelpWidget] Fetching from:", url);

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[HelpWidget] API error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log("[HelpWidget] Raw response:", JSON.stringify(data, null, 2));

    const entries = data.entries as HelpWidgetContent[];
    console.log("[HelpWidget] Entries found:", entries?.length || 0);

    if (entries && entries.length > 0) {
      console.log("[HelpWidget] Returning first entry:", entries[0]);
      return entries[0];
    }

    return null;
  } catch (error) {
    console.error("[Contentstack] Error fetching help widget:", error);
    return null;
  }
}

// ============================================================================
// Article Functions
// ============================================================================

// Fetch all articles with pagination
export async function getArticles(
  limit = 10,
  skip = 0
): Promise<{ articles: Article[]; total: number }> {
  try {
    const result = await Stack.ContentType("article")
      .Query()
      .includeReference(["category"])
      .includeCount()
      .limit(limit)
      .skip(skip)
      .descending("created_at")
      .toJSON()
      .find();

    return {
      articles: (result[0] || []) as Article[],
      total: (result[1] as number) || 0,
    };
  } catch (error) {
    console.error("Error fetching articles:", error);
    return { articles: [], total: 0 };
  }
}

// Fetch single article by slug
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  try {
    const result = await Stack.ContentType("article")
      .Query()
      .where("slug", slug)
      .includeReference(["category"])
      .toJSON()
      .find();

    return (result[0]?.[0] as Article) || null;
  } catch (error) {
    console.error("Error fetching article:", error);
    return null;
  }
}

// Fetch articles by their UIDs (for Lytics recommendations)
export async function getArticlesByUids(uids: string[]): Promise<Article[]> {
  if (!uids.length) return [];

  try {
    console.log("[Contentstack] Fetching articles by UIDs:", uids);

    const result = await Stack.ContentType("article")
      .Query()
      .containedIn("uid", uids)
      .includeReference(["category"])
      .toJSON()
      .find();

    const articles = (result[0] || []) as Article[];
    console.log("[Contentstack] Found articles:", articles.length);

    // Sort by the original UID order (to maintain Lytics ranking)
    const uidOrder = new Map(uids.map((uid, index) => [uid, index]));
    articles.sort((a, b) => {
      const orderA = uidOrder.get(a.uid) ?? 999;
      const orderB = uidOrder.get(b.uid) ?? 999;
      return orderA - orderB;
    });

    return articles;
  } catch (error) {
    console.error("[Contentstack] Error fetching articles by UIDs:", error);
    return [];
  }
}

// Helper to get category UID from article (category is an array in Contentstack)
export function getArticleCategoryUid(article: Article): string | undefined {
  if (!article.category || !Array.isArray(article.category)) return undefined;
  const cat = article.category[0];
  return typeof cat === "object" ? cat.uid : undefined;
}

// Helper to get category object from article
export function getArticleCategory(article: Article): Category | undefined {
  if (!article.category || !Array.isArray(article.category)) return undefined;
  const cat = article.category[0];
  return typeof cat === "object" && "title" in cat
    ? (cat as Category)
    : undefined;
}

// Fetch articles by category
export async function getArticlesByCategory(
  categoryUid: string,
  limit = 20
): Promise<Article[]> {
  try {
    // For reference fields, we need to query using the reference UID format
    const result = await Stack.ContentType("article")
      .Query()
      .includeReference(["category"])
      .limit(100) // Fetch more to filter
      .descending("created_at")
      .toJSON()
      .find();

    // Filter by category UID since category is an array
    const articles = (result[0] || []) as Article[];
    return articles
      .filter((article) => getArticleCategoryUid(article) === categoryUid)
      .slice(0, limit);
  } catch (error) {
    console.error("Error fetching articles by category:", error);
    return [];
  }
}

// Fetch articles by category slug
export async function getArticlesByCategorySlug(
  categorySlug: string,
  limit = 20
): Promise<Article[]> {
  try {
    // First get the category
    const category = await getCategoryBySlug(categorySlug);
    if (!category) return [];

    return getArticlesByCategory(category.uid, limit);
  } catch (error) {
    console.error("Error fetching articles by category slug:", error);
    return [];
  }
}

// Search articles
export async function searchArticles(query: string): Promise<Article[]> {
  if (!query.trim()) return [];

  try {
    // Search in title and excerpt
    const titleResult = await Stack.ContentType("article")
      .Query()
      .regex("title", query, "i")
      .includeReference(["category"])
      .limit(10)
      .toJSON()
      .find();

    const excerptResult = await Stack.ContentType("article")
      .Query()
      .regex("excerpt", query, "i")
      .includeReference(["category"])
      .limit(10)
      .toJSON()
      .find();

    // Combine and dedupe results
    const combined = [...(titleResult[0] || []), ...(excerptResult[0] || [])];
    const uniqueMap = new Map<string, Article>();
    combined.forEach((article: Article) => {
      if (!uniqueMap.has(article.uid)) {
        uniqueMap.set(article.uid, article);
      }
    });

    return Array.from(uniqueMap.values()).slice(0, 10);
  } catch (error) {
    console.error("Error searching articles:", error);
    return [];
  }
}

// Search result with boost score
export interface BoostedSearchResult extends Article {
  searchScore: number;
  affinityBoost: number;
  totalScore: number;
  matchedTopics: string[];
}

// Search articles with topic affinity boosting
export async function searchArticlesWithBoost(
  query: string,
  userTopicAffinities: Record<string, number>
): Promise<BoostedSearchResult[]> {
  if (!query.trim()) return [];

  try {
    console.log("[Search] Query:", query);
    console.log("[Search] User topic affinities:", userTopicAffinities);

    // Get base search results
    const baseResults = await searchArticles(query);
    console.log("[Search] Base results:", baseResults.length);

    if (baseResults.length === 0) return [];

    // Calculate affinity scores for each article
    const boostedResults: BoostedSearchResult[] = baseResults.map((article, index) => {
      const matchedTopics: string[] = [];
      let maxAffinity = 0;

      // Check article against user's topic affinities
      const articleTags = article.article_tags || [];
      const articleTitle = article.title?.toLowerCase() || "";
      const articleExcerpt = article.excerpt?.toLowerCase() || "";

      for (const [topic, affinity] of Object.entries(userTopicAffinities)) {
        const topicLower = topic.toLowerCase();

        // Check if topic matches tags, title, or excerpt
        const matchesTag = articleTags.some(
          (tag) =>
            tag.toLowerCase().includes(topicLower) ||
            topicLower.includes(tag.toLowerCase())
        );
        const matchesTitle = articleTitle.includes(topicLower);
        const matchesExcerpt = articleExcerpt.includes(topicLower);

        if (matchesTag || matchesTitle || matchesExcerpt) {
          matchedTopics.push(topic);
          // Track the highest affinity score among matched topics
          maxAffinity = Math.max(maxAffinity, affinity);
        }
      }

      // affinityBoost is the max affinity score (0-1) as percentage
      // This represents how much this article aligns with user's top interests
      const affinityBoost = Math.round(maxAffinity * 100);

      // Search score based on position (for sorting, not display)
      const searchScore = 100 - index * 5;

      // Total score for sorting: prioritize personalized matches
      const totalScore = searchScore + affinityBoost;

      return {
        ...article,
        searchScore,
        affinityBoost, // This is what we show as "match %"
        totalScore,
        matchedTopics,
      };
    });

    // Sort by total score descending (personalized results bubble up)
    boostedResults.sort((a, b) => b.totalScore - a.totalScore);

    console.log(
      "[Search] Boosted results:",
      boostedResults.map((r) => ({
        title: r.title,
        affinityBoost: r.affinityBoost,
        matchedTopics: r.matchedTopics,
      }))
    );

    return boostedResults;
  } catch (error) {
    console.error("[Search] Error in boosted search:", error);
    return [];
  }
}

// Fetch featured articles
export async function getFeaturedArticles(limit = 3): Promise<Article[]> {
  try {
    const result = await Stack.ContentType("article")
      .Query()
      .where("featured", true)
      .includeReference(["category"])
      .limit(limit)
      .toJSON()
      .find();

    return (result[0] || []) as Article[];
  } catch (error) {
    console.error("Error fetching featured articles:", error);
    return [];
  }
}

// Fetch popular articles (by views)
export async function getPopularArticles(limit = 5): Promise<Article[]> {
  try {
    const result = await Stack.ContentType("article")
      .Query()
      .includeReference(["category"])
      .descending("views")
      .limit(limit)
      .toJSON()
      .find();

    return (result[0] || []) as Article[];
  } catch (error) {
    console.error("Error fetching popular articles:", error);
    return [];
  }
}

// Fetch recent articles
export async function getRecentArticles(limit = 5): Promise<Article[]> {
  try {
    const result = await Stack.ContentType("article")
      .Query()
      .includeReference(["category"])
      .descending("created_at")
      .limit(limit)
      .toJSON()
      .find();

    return (result[0] || []) as Article[];
  } catch (error) {
    console.error("Error fetching recent articles:", error);
    return [];
  }
}

// Fetch related articles (same category, excluding current)
export async function getRelatedArticles(
  article: Article,
  limit = 3
): Promise<Article[]> {
  try {
    const categoryUid = getArticleCategoryUid(article);
    if (!categoryUid) return [];

    const result = await Stack.ContentType("article")
      .Query()
      .notEqualTo("uid", article.uid)
      .includeReference(["category"])
      .limit(50) // Fetch more to filter
      .toJSON()
      .find();

    // Filter by same category
    const articles = (result[0] || []) as Article[];
    return articles
      .filter((a) => getArticleCategoryUid(a) === categoryUid)
      .slice(0, limit);
  } catch (error) {
    console.error("Error fetching related articles:", error);
    return [];
  }
}

// Fetch articles by tags
export async function getArticlesByTags(
  tags: string[],
  limit = 5
): Promise<Article[]> {
  try {
    const result = await Stack.ContentType("article")
      .Query()
      .containedIn("article_tags", tags)
      .includeReference(["category"])
      .limit(limit)
      .toJSON()
      .find();

    return (result[0] || []) as Article[];
  } catch (error) {
    console.error("Error fetching articles by tags:", error);
    return [];
  }
}

// ============================================================================
// Category Functions
// ============================================================================

// Fetch all categories
export async function getCategories(): Promise<Category[]> {
  try {
    const result = await Stack.ContentType("category")
      .Query()
      .ascending("order")
      .toJSON()
      .find();

    return (result[0] || []) as Category[];
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

// Fetch category by slug
export async function getCategoryBySlug(
  slug: string
): Promise<Category | null> {
  try {
    const result = await Stack.ContentType("category")
      .Query()
      .where("slug", slug)
      .toJSON()
      .find();

    return (result[0]?.[0] as Category) || null;
  } catch (error) {
    console.error("Error fetching category:", error);
    return null;
  }
}

// Fetch categories with article counts
export async function getCategoriesWithCounts(): Promise<
  (Category & { article_count: number })[]
> {
  try {
    const categories = await getCategories();

    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        try {
          // Fetch articles for this category and count them
          const articles = await getArticlesByCategory(category.uid, 100);
          return {
            ...category,
            article_count: articles.length,
          };
        } catch {
          return {
            ...category,
            article_count: 0,
          };
        }
      })
    );

    return categoriesWithCounts;
  } catch (error) {
    console.error("Error fetching categories with counts:", error);
    return [];
  }
}

// ============================================================================
// Personalization Functions
// ============================================================================

// Fetch personalized content by audience segment
export async function getPersonalizedContent(
  audienceSegment: string
): Promise<PersonalizedContent[]> {
  try {
    const result = await Stack.ContentType("personalized_content")
      .Query()
      .where("audience_segment", audienceSegment)
      .toJSON()
      .find();

    return (result[0] || []) as PersonalizedContent[];
  } catch (error) {
    console.error("Error fetching personalized content:", error);
    return [];
  }
}

// Fetch hero content by segment
export async function getHeroContent(
  segment: string
): Promise<HeroContent | null> {
  try {
    const result = await Stack.ContentType("hero_content")
      .Query()
      .where("segment", segment)
      .toJSON()
      .find();

    return (result[0]?.[0] as HeroContent) || null;
  } catch (error) {
    console.error("Error fetching hero content:", error);
    return null;
  }
}

// Fetch recommended articles based on user interests/affinities
export async function getRecommendedArticles(
  interests: string[],
  affinities: string[],
  limit = 3
): Promise<Article[]> {
  try {
    // Combine interests and affinities as tags to search
    const searchTags = [...interests, ...affinities].slice(0, 5);

    if (searchTags.length === 0) {
      // Return featured articles if no interests
      return getFeaturedArticles(limit);
    }

    const result = await Stack.ContentType("article")
      .Query()
      .containedIn("tags", searchTags)
      .includeReference(["category"])
      .limit(limit)
      .toJSON()
      .find();

    const articles = (result[0] || []) as Article[];

    // If not enough results, supplement with featured
    if (articles.length < limit) {
      const featured = await getFeaturedArticles(limit - articles.length);
      const existingUids = new Set(articles.map((a) => a.uid));
      featured.forEach((article) => {
        if (!existingUids.has(article.uid)) {
          articles.push(article);
        }
      });
    }

    return articles.slice(0, limit);
  } catch (error) {
    console.error("Error fetching recommended articles:", error);
    return [];
  }
}

// ============================================================================
// Ticket Category Functions
// ============================================================================

// Fetch ticket categories with suggested articles
export async function getTicketCategories(): Promise<TicketCategory[]> {
  try {
    const result = await Stack.ContentType("ticket_category")
      .Query()
      .includeReference(["suggested_articles"])
      .toJSON()
      .find();

    return (result[0] || []) as TicketCategory[];
  } catch (error) {
    console.error("Error fetching ticket categories:", error);
    return [];
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

// Increment article view count (would need Management API in production)
export async function incrementArticleViews(articleUid: string): Promise<void> {
  // This would typically be done via a serverless function with Management API
  // For now, we'll track views in Lytics instead
  console.log("Tracking view for article:", articleUid);
}

// Format date for display
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Calculate reading time from content
export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

// Get category icon component name
export function getCategoryIcon(iconName: string): string {
  const iconMap: Record<string, string> = {
    "file-text": "FileText",
    settings: "Settings",
    "credit-card": "CreditCard",
    code: "Code",
    "help-circle": "HelpCircle",
    users: "Users",
    zap: "Zap",
    shield: "Shield",
    book: "BookOpen",
  };
  return iconMap[iconName] || "FileText";
}

export default Stack;

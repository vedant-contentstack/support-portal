"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Bookmark,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  FileText,
  MessageSquare,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  trackArticleView,
  trackArticleFeedback,
  trackEvent,
  trackPageView,
} from "@/lib/lytics";
import { useLytics } from "@/components/LyticsProvider";
import {
  LyticsMetaTags,
  generateTopicsFromArticle,
} from "@/components/LyticsMetaTags";
import {
  getArticleBySlug,
  getRelatedArticles,
  formatDate,
  type Article,
} from "@/lib/contentstack";

export default function ArticlePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<
    "helpful" | "not_helpful" | null
  >(null);
  const { profile } = useLytics();

  // Load article data
  useEffect(() => {
    async function loadArticle() {
      setIsLoading(true);
      setError(null);

      try {
        const articleData = await getArticleBySlug(slug);

        if (!articleData) {
          setError("Article not found");
          setIsLoading(false);
          return;
        }

        setArticle(articleData);

        // Load related articles
        const related = await getRelatedArticles(articleData, 3);
        setRelatedArticles(related);

        // Track view with enhanced data for content affinity
        const cat = Array.isArray(articleData.category)
          ? articleData.category[0]
          : null;
        const categoryTitle: string =
          cat && typeof cat === "object" && "title" in cat
            ? String(cat.title)
            : "";
        const categorySlug: string =
          cat && typeof cat === "object" && "slug" in cat
            ? String(cat.slug)
            : "";

        // Generate topics for Lytics content affinity
        const topics = generateTopicsFromArticle(articleData);

        // Track article view
        trackArticleView({
          uid: articleData.uid,
          title: articleData.title,
          category: categoryTitle,
          tags: articleData.article_tags || [],
        });

        // Also send enhanced page view with topic data
        trackPageView({
          page_type: "article",
          content_category: categorySlug,
          content_topics: topics,
          content_title: articleData.title,
          reading_time: articleData.reading_time,
        });
      } catch (err) {
        console.error("Error loading article:", err);
        setError("Failed to load article");
      }

      setIsLoading(false);
    }

    loadArticle();
  }, [slug]);

  // Check for bookmarks in localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && article) {
      const bookmarks = JSON.parse(
        localStorage.getItem("bookmarked_articles") || "[]"
      );
      setIsBookmarked(bookmarks.includes(article.uid));
    }
  }, [article]);

  const handleFeedback = (isHelpful: boolean) => {
    if (!article) return;
    setFeedbackGiven(isHelpful ? "helpful" : "not_helpful");
    trackArticleFeedback(article.uid, isHelpful);
  };

  const handleShare = async () => {
    if (!article) return;

    if (navigator.share) {
      await navigator.share({
        title: article.title,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
    trackEvent("article_share", { article_uid: article.uid });
  };

  const handleBookmark = () => {
    if (!article) return;

    const bookmarks = JSON.parse(
      localStorage.getItem("bookmarked_articles") || "[]"
    );

    if (isBookmarked) {
      const updated = bookmarks.filter((uid: string) => uid !== article.uid);
      localStorage.setItem("bookmarked_articles", JSON.stringify(updated));
    } else {
      bookmarks.push(article.uid);
      localStorage.setItem("bookmarked_articles", JSON.stringify(bookmarks));
    }

    setIsBookmarked(!isBookmarked);
    trackEvent("article_bookmark", {
      article_uid: article.uid,
      bookmarked: !isBookmarked,
    });
  };

  const getCategoryTitle = (): string => {
    if (!article || !Array.isArray(article.category) || !article.category[0])
      return "";
    const cat = article.category[0];
    return typeof cat === "object" && "title" in cat ? cat.title : "";
  };

  const getCategorySlug = (): string => {
    if (!article || !Array.isArray(article.category) || !article.category[0])
      return "";
    const cat = article.category[0];
    return typeof cat === "object" && "slug" in cat ? cat.slug : "";
  };

  // Render markdown-like content to HTML
  const renderContent = (content: string) => {
    if (!content) return "";

    return content
      .replace(
        /^### (.+)$/gm,
        '<h3 class="text-xl font-semibold mt-6 mb-3 text-surface-900">$1</h3>'
      )
      .replace(
        /^## (.+)$/gm,
        '<h2 class="font-display text-2xl font-semibold mt-8 mb-4 text-surface-900">$1</h2>'
      )
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(
        /`([^`]+)`/g,
        '<code class="px-1.5 py-0.5 bg-surface-100 rounded text-sm font-mono">$1</code>'
      )
      .replace(
        /```(\w+)?\n([\s\S]+?)```/g,
        '<pre class="bg-surface-800 text-surface-100 p-4 rounded-lg overflow-x-auto my-4"><code>$2</code></pre>'
      )
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" class="text-primary-600 hover:underline">$1</a>'
      )
      .replace(/^- (.+)$/gm, '<li class="ml-4 mb-1">$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 mb-1">$2</li>')
      .replace(/\n\n/g, '</p><p class="mb-4">');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-surface-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-surface-900 mb-2">
            {error || "Article not found"}
          </h1>
          <p className="text-surface-600 mb-6">
            The article you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Docs
          </Link>
        </div>
      </div>
    );
  }

  // Generate topics for Lytics meta tags
  const lyticsTopics = generateTopicsFromArticle(article);
  const categoryTitle = getCategoryTitle();

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Lytics Content Affinity Meta Tags */}
      <LyticsMetaTags
        topics={lyticsTopics}
        contentType="article"
        category={categoryTitle}
        title={article.title}
      />

      {/* Header */}
      <div className="bg-white border-b border-surface-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-surface-500 mb-6">
              <Link
                href="/"
                className="hover:text-primary-600 transition-colors"
              >
                Home
              </Link>
              <ChevronRight className="w-4 h-4" />
              <Link
                href="/docs"
                className="hover:text-primary-600 transition-colors"
              >
                Docs
              </Link>
              <ChevronRight className="w-4 h-4" />
              {getCategoryTitle() && (
                <>
                  <Link
                    href={`/docs?category=${getCategorySlug()}`}
                    className="hover:text-primary-600 transition-colors"
                  >
                    {getCategoryTitle()}
                  </Link>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
              <span className="text-surface-900 truncate">{article.title}</span>
            </div>

            {/* Title */}
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-surface-900">
              {article.title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-surface-500">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {article.reading_time || 5} min read
              </span>
              <span>
                Updated {formatDate(article.updated_at || article.created_at)}
              </span>
              {article.article_tags && article.article_tags.length > 0 && (
                <div className="flex items-center gap-2">
                  {article.article_tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-surface-100 text-surface-600 rounded-full text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-6">
              <button
                onClick={handleBookmark}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  isBookmarked
                    ? "bg-primary-100 text-primary-700"
                    : "bg-surface-100 text-surface-600 hover:bg-surface-200"
                }`}
              >
                <Bookmark
                  className={`w-4 h-4 ${isBookmarked ? "fill-current" : ""}`}
                />
                {isBookmarked ? "Saved" : "Save"}
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-3 py-1.5 bg-surface-100 text-surface-600 rounded-lg text-sm hover:bg-surface-200 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3"
          >
            <div className="bg-white rounded-2xl border border-surface-200 p-8">
              {article.excerpt && (
                <p className="text-lg text-surface-600 mb-6 pb-6 border-b border-surface-100">
                  {article.excerpt}
                </p>
              )}
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{
                  __html: renderContent(article.content || ""),
                }}
              />
            </div>

            {/* Feedback */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-8 bg-white rounded-2xl border border-surface-200 p-6"
            >
              <h3 className="font-semibold text-surface-900 mb-4">
                Was this article helpful?
              </h3>

              {feedbackGiven ? (
                <div className="flex items-center gap-3 text-accent-mint">
                  <CheckCircle className="w-5 h-5" />
                  <span>Thanks for your feedback!</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleFeedback(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-accent-mint/10 text-accent-mint rounded-lg hover:bg-accent-mint/20 transition-colors"
                  >
                    <ThumbsUp className="w-5 h-5" />
                    Yes, helpful
                  </button>
                  <button
                    onClick={() => handleFeedback(false)}
                    className="flex items-center gap-2 px-4 py-2 bg-surface-100 text-surface-600 rounded-lg hover:bg-surface-200 transition-colors"
                  >
                    <ThumbsDown className="w-5 h-5" />
                    Not really
                  </button>
                </div>
              )}

              {feedbackGiven === "not_helpful" && (
                <div className="mt-4 p-4 bg-surface-50 rounded-lg">
                  <p className="text-sm text-surface-600 mb-3">
                    We&apos;re sorry this wasn&apos;t helpful. Would you like to
                    submit a ticket for personalized support?
                  </p>
                  <Link
                    href="/support/ticket"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Get Support
                  </Link>
                </div>
              )}
            </motion.div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8">
              <Link
                href="/docs"
                className="flex items-center gap-2 text-surface-600 hover:text-primary-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Docs
              </Link>
            </div>
          </motion.div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Related Articles */}
            {relatedArticles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl border border-surface-200 p-5"
              >
                <h3 className="font-semibold text-surface-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary-500" />
                  Related Articles
                </h3>
                <div className="space-y-3">
                  {relatedArticles.map((related) => (
                    <Link
                      key={related.uid}
                      href={`/docs/${related.slug}`}
                      className="block group"
                    >
                      <span className="text-sm font-medium text-surface-900 group-hover:text-primary-600 transition-colors line-clamp-2">
                        {related.title}
                      </span>
                      <span className="text-xs text-surface-500">
                        {Array.isArray(related.category) &&
                        related.category[0] &&
                        typeof related.category[0] === "object" &&
                        "title" in related.category[0]
                          ? related.category[0].title
                          : ""}
                      </span>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Need Help */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-5 text-white"
            >
              <h3 className="font-semibold mb-2">Still need help?</h3>
              <p className="text-sm text-primary-100 mb-4">
                Our support team is ready to assist you.
              </p>
              <Link
                href="/support/ticket"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-50 transition-colors"
              >
                Contact Support
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

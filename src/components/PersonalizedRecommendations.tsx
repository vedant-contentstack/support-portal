"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  Clock,
  BookOpen,
} from "lucide-react";
import { useLytics } from "./LyticsProvider";
import {
  fetchLyticsRecommendations,
  trackEvent,
} from "@/lib/lytics";
import {
  getArticlesByUids,
  getFeaturedArticles,
  type Article,
} from "@/lib/contentstack";

export function PersonalizedRecommendations() {
  const { profile, isLoading: profileLoading } = useLytics();
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPersonalized, setIsPersonalized] = useState(false);

  useEffect(() => {
    async function loadRecommendations() {
      setIsLoading(true);

      try {
        // Try Lytics recommendations first if user has a UID
        if (!profileLoading && profile?.uid) {
          console.log(
            "[Recommendations] Fetching Lytics recommendations for:",
            profile.uid
          );

          // Get first 3 recommendations from Lytics
          const lyticsRecs = await fetchLyticsRecommendations(profile.uid, 3);
          console.log("[Recommendations] Lytics recommendations:", lyticsRecs);

          if (lyticsRecs.length > 0) {
            // Extract contentstack UIDs (first 3 only)
            const uids = lyticsRecs
              .slice(0, 3)
              .map((rec) => rec.contentstack_uid)
              .filter(Boolean);
            console.log("[Recommendations] Contentstack UIDs:", uids);

            // Fetch full article details from Contentstack
            const fullArticles = await getArticlesByUids(uids);
            console.log(
              "[Recommendations] Full articles from Contentstack:",
              fullArticles.length
            );

            if (fullArticles.length > 0) {
              setArticles(fullArticles.slice(0, 3));
              setIsPersonalized(true);

              // Track recommendations shown
              trackEvent("lytics_recommendations_shown", {
                user_uid: profile.uid,
                articles: fullArticles.map((a) => a.uid),
              });

              setIsLoading(false);
              return;
            }
          }
        }

        // Fallback to featured articles
        console.log("[Recommendations] Falling back to featured articles");
        const featured = await getFeaturedArticles(3);
        setArticles(featured);
        setIsPersonalized(false);
      } catch (error) {
        console.error("[Recommendations] Error:", error);
        // Try to load featured articles as fallback
        try {
          const featured = await getFeaturedArticles(3);
          setArticles(featured);
          setIsPersonalized(false);
        } catch {
          setArticles([]);
        }
      }

      setIsLoading(false);
    }

    loadRecommendations();
  }, [profile, profileLoading]);

  const handleArticleClick = (article: Article) => {
    const cat = Array.isArray(article.category) ? article.category[0] : null;
    const categoryName =
      cat && typeof cat === "object" && "title" in cat ? cat.title : "";
    trackEvent("recommendation_click", {
      article_uid: article.uid,
      article_title: article.title,
      category: categoryName,
      is_personalized: isPersonalized,
    });
  };

  const getCategoryName = (article: Article): string => {
    if (Array.isArray(article.category) && article.category[0]) {
      const cat = article.category[0];
      if (typeof cat === "object" && "title" in cat) {
        return cat.title;
      }
    }
    return "";
  };

  if (isLoading) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="animate-pulse">
          <div className="h-8 w-64 bg-surface-200 rounded-lg mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 border border-surface-200"
              >
                <div className="h-4 w-20 bg-surface-200 rounded mb-4" />
                <div className="h-6 w-full bg-surface-200 rounded mb-3" />
                <div className="h-4 w-full bg-surface-200 rounded mb-2" />
                <div className="h-4 w-2/3 bg-surface-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Don't render if no articles
  if (articles.length === 0) {
    return null;
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-xl">
              <Sparkles className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-surface-900">
                {isPersonalized ? "Recommended for You" : "Featured Articles"}
              </h2>
              <p className="text-sm text-surface-500 mt-0.5">
                {isPersonalized
                  ? "Based on your interests and reading history"
                  : "Popular articles from our knowledge base"}
              </p>
            </div>
          </div>
          <Link
            href="/docs"
            className="hidden sm:flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
          >
            View all articles
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {articles.map((article, index) => (
            <motion.div
              key={article.uid}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                href={`/docs/${article.slug}`}
                onClick={() => handleArticleClick(article)}
                className="block h-full p-6 bg-white rounded-2xl border border-surface-200 card-hover group"
              >
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  {getCategoryName(article) && (
                    <span className="px-2.5 py-1 text-xs font-medium bg-primary-50 text-primary-700 rounded-full">
                      {getCategoryName(article)}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs text-surface-500">
                    <Clock className="w-3 h-3" />
                    {article.reading_time || 5} min read
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-surface-900 group-hover:text-primary-600 transition-colors line-clamp-2">
                  {article.title}
                </h3>
                {article.excerpt && (
                  <p className="mt-2 text-sm text-surface-600 line-clamp-2">
                    {article.excerpt}
                  </p>
                )}
                <div className="mt-4 flex items-center gap-2 text-sm font-medium text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  <BookOpen className="w-4 h-4" />
                  Read article
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <Link
          href="/docs"
          className="flex sm:hidden items-center justify-center gap-2 mt-6 py-3 text-sm font-medium text-primary-600 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors"
        >
          View all articles
          <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>
    </section>
  );
}

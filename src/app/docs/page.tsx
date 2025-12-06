"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  BookOpen,
  FileText,
  Settings,
  CreditCard,
  Code,
  HelpCircle,
  Users,
  ChevronRight,
  Clock,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { trackSearch, trackEvent, trackPageView } from "@/lib/lytics";
import { useLytics } from "@/components/LyticsProvider";
import { LyticsMetaTags } from "@/components/LyticsMetaTags";
import {
  getCategories,
  getArticlesByCategorySlug,
  searchArticles,
  getPopularArticles,
  type Category,
  type Article,
} from "@/lib/contentstack";

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "file-text": FileText,
  FileText: FileText,
  settings: Settings,
  Settings: Settings,
  "credit-card": CreditCard,
  CreditCard: CreditCard,
  code: Code,
  Code: Code,
  "help-circle": HelpCircle,
  HelpCircle: HelpCircle,
  users: Users,
  Users: Users,
  book: BookOpen,
  BookOpen: BookOpen,
};

// Color mapping
const colorMap: Record<string, string> = {
  primary: "bg-primary-500",
  mint: "bg-accent-mint",
  amber: "bg-accent-amber",
  coral: "bg-accent-coral",
  purple: "bg-purple-500",
  cyan: "bg-cyan-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
};

interface CategoryWithArticles extends Category {
  articles: Article[];
}

function DocsPageContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const initialCategory = searchParams.get("category") || "";

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    initialCategory || null
  );
  const [searchResults, setSearchResults] = useState<Article[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [categories, setCategories] = useState<CategoryWithArticles[]>([]);
  const [popularArticles, setPopularArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { profile } = useLytics();

  // Load categories and articles
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);

      try {
        // Load categories
        const cats = await getCategories();

        // Load articles for each category
        const catsWithArticles = await Promise.all(
          cats.map(async (cat) => {
            const articles = await getArticlesByCategorySlug(cat.slug);
            return { ...cat, articles };
          })
        );

        setCategories(catsWithArticles);

        // Load popular articles
        const popular = await getPopularArticles(4);
        setPopularArticles(popular);
      } catch (error) {
        console.error("Error loading docs data:", error);
      }

      setIsLoading(false);
    }

    loadData();
  }, []);

  useEffect(() => {
    trackEvent("docs_page_view", { initial_search: initialSearch });
  }, [initialSearch]);

  // Search functionality
  useEffect(() => {
    async function performSearch() {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      const results = await searchArticles(searchQuery);
      setSearchResults(results);
      trackSearch(searchQuery, results.length);
      setIsSearching(false);
    }

    const debounce = setTimeout(performSearch, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const filteredCategories = selectedCategory
    ? categories.filter((c) => c.slug === selectedCategory)
    : categories;

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
      <div className="min-h-screen bg-gradient-subtle">
        <div className="bg-white border-b border-surface-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="animate-pulse">
              <div className="h-4 w-32 bg-surface-200 rounded mb-4" />
              <div className="h-10 w-64 bg-surface-200 rounded mb-4" />
              <div className="h-6 w-96 bg-surface-200 rounded mb-8" />
              <div className="h-14 w-full bg-surface-200 rounded" />
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  // Generate topics based on current category filter
  const currentCategoryTopics = selectedCategory
    ? [selectedCategory, "documentation", "help", "support"]
    : ["documentation", "help", "support", "getting-started"];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Lytics Content Affinity Meta Tags */}
      <LyticsMetaTags
        topics={currentCategoryTopics}
        contentType="documentation"
        category={selectedCategory || "all"}
        title="Documentation"
      />

      {/* Header */}
      <div className="bg-white border-b border-surface-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
          >
            <div className="flex items-center gap-2 text-sm text-surface-500 mb-4">
              <Link
                href="/"
                className="hover:text-primary-600 transition-colors"
              >
                Home
              </Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-surface-900">Documentation</span>
            </div>
            <h1 className="font-display text-4xl font-bold text-surface-900">
              Documentation
            </h1>
            <p className="mt-4 text-lg text-surface-600">
              Everything you need to know about our platform. Browse by category
              or search for specific topics.
            </p>

            {/* Search */}
            <div className="mt-8 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
              <input
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
              {isSearching && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400 animate-spin" />
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Search Results */}
        {searchQuery && searchResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-12"
          >
            <h2 className="text-lg font-semibold text-surface-900 mb-4">
              {searchResults.length} result
              {searchResults.length !== 1 ? "s" : ""} for &quot;{searchQuery}
              &quot;
            </h2>
            <div className="bg-white rounded-2xl border border-surface-200 divide-y divide-surface-100">
              {searchResults.map((article) => (
                <Link
                  key={article.uid}
                  href={`/docs/${article.slug}`}
                  className="flex items-center justify-between p-4 hover:bg-surface-50 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-surface-400" />
                    <div>
                      <span className="font-medium text-surface-900">
                        {article.title}
                      </span>
                      {getCategoryName(article) && (
                        <span className="ml-2 text-xs text-surface-500">
                          in {getCategoryName(article)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-surface-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {article.reading_time || 5} min
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {searchQuery && searchResults.length === 0 && !isSearching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-12 text-center py-12 bg-white rounded-2xl border border-surface-200"
          >
            <HelpCircle className="w-12 h-12 text-surface-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-surface-900">
              No results found
            </h3>
            <p className="text-surface-500 mt-2">
              Try different keywords or{" "}
              <Link
                href="/support/ticket"
                className="text-primary-600 hover:underline"
              >
                submit a support ticket
              </Link>
            </p>
          </motion.div>
        )}

        {/* Category Filter */}
        {!searchQuery && categories.length > 0 && (
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                !selectedCategory
                  ? "bg-primary-600 text-white"
                  : "bg-white text-surface-600 border border-surface-200 hover:border-primary-300"
              }`}
            >
              All Categories
            </button>
            {categories.map((category) => (
              <button
                key={category.uid}
                onClick={() => setSelectedCategory(category.slug)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category.slug
                    ? "bg-primary-600 text-white"
                    : "bg-white text-surface-600 border border-surface-200 hover:border-primary-300"
                }`}
              >
                {category.title}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {!searchQuery && filteredCategories.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border border-surface-200">
                <BookOpen className="w-12 h-12 text-surface-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-surface-900">
                  No categories found
                </h3>
                <p className="text-surface-500 mt-2">
                  Add categories and articles in Contentstack CMS.
                </p>
              </div>
            )}

            {!searchQuery &&
              filteredCategories.map((category, index) => {
                const IconComponent = iconMap[category.icon] || FileText;
                const bgColor = colorMap[category.color] || "bg-primary-500";

                return (
                  <motion.div
                    key={category.uid}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-2xl border border-surface-200 overflow-hidden"
                  >
                    <div className="p-6 border-b border-surface-100">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center`}
                        >
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold text-surface-900">
                            {category.title}
                          </h2>
                          <p className="text-sm text-surface-500">
                            {category.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    {category.articles.length === 0 ? (
                      <div className="p-6 text-center text-surface-500">
                        No articles in this category yet.
                      </div>
                    ) : (
                      <div className="divide-y divide-surface-100">
                        {category.articles.map((article) => (
                          <Link
                            key={article.uid}
                            href={`/docs/${article.slug}`}
                            className="flex items-center justify-between p-4 hover:bg-surface-50 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-surface-400 group-hover:text-primary-500 transition-colors" />
                              <span className="font-medium text-surface-900 group-hover:text-primary-600 transition-colors">
                                {article.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-surface-500 flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {article.reading_time || 5} min
                              </span>
                              <ArrowRight className="w-4 h-4 text-surface-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Popular Articles */}
            {popularArticles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-2xl border border-surface-200 p-6"
              >
                <h3 className="font-semibold text-surface-900 mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary-500" />
                  Popular Articles
                </h3>
                <div className="space-y-3">
                  {popularArticles.map((article, index) => (
                    <Link
                      key={article.uid}
                      href={`/docs/${article.slug}`}
                      className="block group"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-surface-100 text-surface-500 rounded-full flex items-center justify-center text-sm font-medium group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors">
                          {index + 1}
                        </span>
                        <div>
                          <span className="text-sm font-medium text-surface-900 group-hover:text-primary-600 transition-colors line-clamp-1">
                            {article.title}
                          </span>
                          <span className="text-xs text-surface-500">
                            {getCategoryName(article)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Need Help? */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-6 text-white"
            >
              <h3 className="font-semibold mb-2">Need more help?</h3>
              <p className="text-sm text-primary-100 mb-4">
                Can&apos;t find what you&apos;re looking for? Our support team
                is here to help.
              </p>
              <Link
                href="/support/ticket"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-50 transition-colors"
              >
                Submit a Ticket
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading fallback for Suspense
function DocsLoading() {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="bg-white border-b border-surface-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse">
            <div className="h-4 w-32 bg-surface-200 rounded mb-4" />
            <div className="h-10 w-64 bg-surface-200 rounded mb-4" />
            <div className="h-6 w-96 bg-surface-200 rounded mb-8" />
            <div className="h-14 w-full bg-surface-200 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DocsPage() {
  return (
    <Suspense fallback={<DocsLoading />}>
      <DocsPageContent />
    </Suspense>
  );
}

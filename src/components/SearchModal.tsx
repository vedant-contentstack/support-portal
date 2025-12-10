"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  X,
  FileText,
  ArrowRight,
  Loader2,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { trackSearch, getUserTopicAffinities } from "@/lib/lytics";
import { useLytics } from "./LyticsProvider";
import {
  searchArticles,
  searchArticlesWithBoost,
  getRecentArticles,
  type Article,
  type BoostedSearchResult,
} from "@/lib/contentstack";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const { profile } = useLytics();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<(Article | BoostedSearchResult)[]>([]);
  const [recentArticles, setRecentArticles] = useState<Article[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isBoosted, setIsBoosted] = useState(false);
  const [userAffinities, setUserAffinities] = useState<Record<string, number>>(
    {}
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent articles and user affinities on mount
  useEffect(() => {
    async function loadInitialData() {
      // Load recent articles
      const recent = await getRecentArticles(3);
      setRecentArticles(recent);

      // Load user affinities if user has a UID
      if (profile?.uid) {
        console.log("[Search] Loading user affinities for:", profile.uid);
        const affinities = await getUserTopicAffinities(profile.uid);
        setUserAffinities(affinities);
        console.log(
          "[Search] User affinities loaded:",
          Object.keys(affinities).length,
          "topics"
        );
      }
    }
    loadInitialData();
  }, [profile?.uid]);

  // Search function with debounce
  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setIsBoosted(false);
        return;
      }

      setIsSearching(true);

      try {
        let searchResults: (Article | BoostedSearchResult)[];

        // Use boosted search if user has affinities
        if (Object.keys(userAffinities).length > 0) {
          console.log("[Search] Using boosted search with affinities");
          searchResults = await searchArticlesWithBoost(
            searchQuery,
            userAffinities
          );
          setIsBoosted(true);
        } else {
          console.log("[Search] Using regular search");
          searchResults = await searchArticles(searchQuery);
          setIsBoosted(false);
        }

        setResults(searchResults);
        setSelectedIndex(0);

        // Track search in Lytics
        trackSearch(searchQuery, searchResults.length);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      }

      setIsSearching(false);
    },
    [userAffinities]
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) {
        if ((e.metaKey || e.ctrlKey) && e.key === "k") {
          e.preventDefault();
        }
        return;
      }

      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          if (results[selectedIndex]) {
            window.location.href = `/docs/${results[selectedIndex].slug}`;
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, results, selectedIndex]);

  // Global keyboard shortcut to open search
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const getCategoryName = (article: Article): string => {
    if (Array.isArray(article.category) && article.category[0]) {
      const cat = article.category[0];
      if (typeof cat === "object" && "title" in cat) {
        return cat.title;
      }
    }
    return "";
  };

  const isBoostedResult = (
    result: Article | BoostedSearchResult
  ): result is BoostedSearchResult => {
    return "affinityBoost" in result;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-surface-900/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.2 }}
          className="max-w-2xl mx-auto mt-[10vh] bg-white rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-200">
            {isSearching ? (
              <Loader2 className="w-5 h-5 text-surface-400 animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-surface-400" />
            )}
            <input
              ref={inputRef}
              type="text"
              placeholder="Search documentation..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 text-lg text-surface-900 placeholder:text-surface-400 outline-none bg-transparent"
            />
            {isBoosted && query && (
              <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                <TrendingUp className="w-3 h-3" />
                Personalized
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {query && results.length === 0 && !isSearching && (
              <div className="px-5 py-12 text-center">
                <p className="text-surface-500">
                  No results found for &quot;{query}&quot;
                </p>
                <p className="text-sm text-surface-400 mt-2">
                  Try different keywords or{" "}
                  <Link
                    href="/support/ticket"
                    className="text-primary-600 hover:underline"
                  >
                    submit a ticket
                  </Link>
                </p>
              </div>
            )}

            {results.length > 0 && (
              <div className="py-2">
                <p className="px-5 py-2 text-xs font-medium text-surface-500 uppercase tracking-wider">
                  {results.length} result{results.length !== 1 ? "s" : ""}
                  {isBoosted && " • Sorted by relevance to your interests"}
                </p>
                {results.map((article, index) => (
                  <Link
                    key={article.uid}
                    href={`/docs/${article.slug}`}
                    onClick={onClose}
                    className={`flex items-start gap-4 px-5 py-3 transition-colors ${
                      index === selectedIndex
                        ? "bg-primary-50"
                        : "hover:bg-surface-50"
                    }`}
                  >
                    <div
                      className={`mt-0.5 p-2 rounded-lg ${
                        index === selectedIndex
                          ? "bg-primary-100 text-primary-600"
                          : "bg-surface-100 text-surface-500"
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`font-medium ${
                            index === selectedIndex
                              ? "text-primary-900"
                              : "text-surface-900"
                          }`}
                        >
                          {article.title}
                        </span>
                        {getCategoryName(article) && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-surface-100 text-surface-600 rounded-full">
                            {getCategoryName(article)}
                          </span>
                        )}
                        {/* Show personalized indicator when article matches user's interests */}
                        {isBoostedResult(article) &&
                          article.affinityBoost > 0 && (
                            <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-50 text-green-600 rounded-full">
                              <TrendingUp className="w-3 h-3" />
                              Recommended
                            </span>
                          )}
                      </div>
                      {article.excerpt && (
                        <p className="text-sm text-surface-500 truncate mt-0.5">
                          {article.excerpt}
                        </p>
                      )}
                      {/* Show matched topics */}
                      {isBoostedResult(article) &&
                        article.matchedTopics.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {article.matchedTopics.slice(0, 3).map((topic) => (
                              <span
                                key={topic}
                                className="text-xs text-surface-500 bg-surface-100 px-1.5 py-0.5 rounded"
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        )}
                    </div>
                    <ArrowRight
                      className={`w-4 h-4 mt-1 transition-colors ${
                        index === selectedIndex
                          ? "text-primary-500"
                          : "text-surface-300"
                      }`}
                    />
                  </Link>
                ))}
              </div>
            )}

            {/* Quick Actions when no query */}
            {!query && (
              <div className="py-4">
                <p className="px-5 py-2 text-xs font-medium text-surface-500 uppercase tracking-wider">
                  Quick Actions
                </p>
                <Link
                  href="/docs"
                  onClick={onClose}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-surface-50 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-primary-50 text-primary-600">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-surface-700">
                    Browse all documentation
                  </span>
                </Link>
                <Link
                  href="/support/ticket"
                  onClick={onClose}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-surface-50 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-accent-coral/10 text-accent-coral">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-surface-700">
                    Submit a support ticket
                  </span>
                </Link>

                {/* Recent Articles */}
                {recentArticles.length > 0 && (
                  <>
                    <p className="px-5 py-2 mt-4 text-xs font-medium text-surface-500 uppercase tracking-wider">
                      Recent Articles
                    </p>
                    {recentArticles.map((article) => (
                      <Link
                        key={article.uid}
                        href={`/docs/${article.slug}`}
                        onClick={onClose}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-surface-50 transition-colors"
                      >
                        <div className="p-2 rounded-lg bg-surface-100 text-surface-500">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-surface-700 block">
                            {article.title}
                          </span>
                          {getCategoryName(article) && (
                            <span className="text-xs text-surface-500">
                              {getCategoryName(article)}
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 bg-surface-50 border-t border-surface-200 text-xs text-surface-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white rounded border border-surface-200">
                  ↑
                </kbd>
                <kbd className="px-1.5 py-0.5 bg-white rounded border border-surface-200">
                  ↓
                </kbd>
                to navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white rounded border border-surface-200">
                  ↵
                </kbd>
                to select
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white rounded border border-surface-200">
                esc
              </kbd>
              to close
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

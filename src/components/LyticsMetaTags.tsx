"use client";

import { useEffect } from "react";
import Head from "next/head";

interface LyticsMetaTagsProps {
  topics?: string[];
  contentType?: string;
  category?: string;
  title?: string;
  author?: string;
}

/**
 * Component to inject Lytics-specific meta tags for better content affinity
 * These tags help Lytics NLP extract accurate topics from pages
 */
export function LyticsMetaTags({
  topics = [],
  contentType,
  category,
  title,
  author,
}: LyticsMetaTagsProps) {
  // Inject meta tags dynamically since we're in a client component
  useEffect(() => {
    // Clean up any existing Lytics meta tags
    const existingTags = document.querySelectorAll('meta[name^="lytics:"]');
    existingTags.forEach((tag) => tag.remove());

    // Add new meta tags
    const head = document.head;

    if (topics.length > 0) {
      const topicsMeta = document.createElement("meta");
      topicsMeta.name = "lytics:topics";
      topicsMeta.content = topics.join(",");
      head.appendChild(topicsMeta);
    }

    if (contentType) {
      const contentTypeMeta = document.createElement("meta");
      contentTypeMeta.name = "lytics:contenttype";
      contentTypeMeta.content = contentType;
      head.appendChild(contentTypeMeta);
    }

    if (category) {
      const categoryMeta = document.createElement("meta");
      categoryMeta.name = "lytics:category";
      categoryMeta.content = category;
      head.appendChild(categoryMeta);
    }

    if (title) {
      const titleMeta = document.createElement("meta");
      titleMeta.name = "lytics:title";
      titleMeta.content = title;
      head.appendChild(titleMeta);
    }

    if (author) {
      const authorMeta = document.createElement("meta");
      authorMeta.name = "lytics:author";
      authorMeta.content = author;
      head.appendChild(authorMeta);
    }

    // Cleanup on unmount
    return () => {
      const tags = document.querySelectorAll('meta[name^="lytics:"]');
      tags.forEach((tag) => tag.remove());
    };
  }, [topics, contentType, category, title, author]);

  return null;
}

/**
 * Helper to generate consistent topic arrays from article data
 */
export function generateTopicsFromArticle(article: {
  article_tags?: string[];
  category?: Array<{ slug?: string; title?: string; uid?: string }>;
  title?: string;
}): string[] {
  const topics: string[] = [];

  // Add article tags
  if (article.article_tags) {
    topics.push(...article.article_tags);
  }

  // Add category as a topic (category is an array in Contentstack)
  if (Array.isArray(article.category) && article.category[0]) {
    const cat = article.category[0];
    if (typeof cat === "object") {
      if ("slug" in cat && cat.slug) {
        topics.push(cat.slug);
      }
      if ("title" in cat && cat.title) {
        topics.push(cat.title.toLowerCase().replace(/\s+/g, "-"));
      }
    }
  }

  // Extract keywords from title
  if (article.title) {
    const titleWords = article.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((word) => word.length > 3);
    topics.push(...titleWords.slice(0, 3)); // Top 3 title keywords
  }

  // Remove duplicates and return
  return Array.from(new Set(topics));
}

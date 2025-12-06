'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Search,
  BookOpen,
  Ticket,
  Zap,
  Shield,
  ArrowRight,
  MessageCircle,
  FileText,
  Settings,
  CreditCard,
  Code,
  HelpCircle,
  Users,
  Loader2,
} from 'lucide-react';
import { useLytics } from '@/components/LyticsProvider';
import { getPrimarySegment, trackEvent } from '@/lib/lytics';
import { PersonalizedRecommendations } from '@/components/PersonalizedRecommendations';
import { getCategoriesWithCounts, getHeroContent, type Category } from '@/lib/contentstack';

// Icon mapping for dynamic categories
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'file-text': FileText,
  'FileText': FileText,
  'settings': Settings,
  'Settings': Settings,
  'credit-card': CreditCard,
  'CreditCard': CreditCard,
  'code': Code,
  'Code': Code,
  'help-circle': HelpCircle,
  'HelpCircle': HelpCircle,
  'users': Users,
  'Users': Users,
  'book': BookOpen,
  'BookOpen': BookOpen,
};

// Color mapping for categories
const colorMap: Record<string, string> = {
  'primary': 'bg-primary-500',
  'mint': 'bg-accent-mint',
  'amber': 'bg-accent-amber',
  'coral': 'bg-accent-coral',
  'purple': 'bg-purple-500',
  'cyan': 'bg-cyan-500',
  'blue': 'bg-blue-500',
  'green': 'bg-green-500',
};

// Default hero content by segment (fallback if CMS content not available)
const defaultHeroContent: Record<string, { title: string; subtitle: string; cta: string; ctaUrl: string }> = {
  new_visitor: {
    title: 'How can we help you today?',
    subtitle: 'Find answers, explore documentation, or get in touch with our support team.',
    cta: 'Get Started',
    ctaUrl: '/docs',
  },
  returning_user: {
    title: 'Welcome back!',
    subtitle: 'Continue exploring or check out what\'s new in our documentation.',
    cta: 'What\'s New',
    ctaUrl: '/docs',
  },
  power_user: {
    title: 'Ready to dive deeper?',
    subtitle: 'Access advanced documentation and developer resources.',
    cta: 'API Reference',
    ctaUrl: '/docs',
  },
  frustrated_user: {
    title: 'We\'re here to help',
    subtitle: 'Get personalized assistance from our support team right away.',
    cta: 'Contact Support',
    ctaUrl: '/support/ticket',
  },
  technical_user: {
    title: 'Developer Resources',
    subtitle: 'Explore APIs, webhooks, and integration guides tailored for developers.',
    cta: 'View Documentation',
    ctaUrl: '/docs',
  },
  default: {
    title: 'How can we help you today?',
    subtitle: 'Find answers, explore documentation, or get in touch with our support team.',
    cta: 'Browse Docs',
    ctaUrl: '/docs',
  },
};

export default function HomePage() {
  const { profile, isLoading: profileLoading } = useLytics();
  const [searchQuery, setSearchQuery] = useState('');
  const [hero, setHero] = useState(defaultHeroContent.default);
  const [categories, setCategories] = useState<(Category & { article_count: number })[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Load categories
  useEffect(() => {
    async function loadCategories() {
      setIsLoadingCategories(true);
      const cats = await getCategoriesWithCounts();
      setCategories(cats);
      setIsLoadingCategories(false);
    }
    loadCategories();
  }, []);

  // Load personalized hero content
  useEffect(() => {
    async function loadHero() {
      if (profileLoading || !profile) return;

      const segment = getPrimarySegment(profile);
      trackEvent('home_view', { segment });

      // Try to fetch from CMS
      const cmsHero = await getHeroContent(segment);
      if (cmsHero) {
        setHero({
          title: cmsHero.title,
          subtitle: cmsHero.subtitle,
          cta: cmsHero.cta_text,
          ctaUrl: cmsHero.cta_url,
        });
      } else {
        // Fall back to default
        setHero(defaultHeroContent[segment] || defaultHeroContent.default);
      }
    }
    loadHero();
  }, [profile, profileLoading]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/docs?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="bg-gradient-subtle min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 bg-gradient-mesh pointer-events-none" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-200 rounded-full blur-3xl opacity-30 animate-float" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent-coral/20 rounded-full blur-3xl opacity-30 animate-float" style={{ animationDelay: '2s' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-surface-900 leading-tight">
              {hero.title}
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-surface-600 leading-relaxed">
              {hero.subtitle}
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mt-10 max-w-2xl mx-auto">
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400 group-focus-within:text-primary-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search for articles, guides, and more..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-14 pr-32 py-4 text-lg bg-white border border-surface-200 rounded-2xl shadow-lg shadow-surface-200/50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Quick Links */}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-surface-600 bg-white border border-surface-200 rounded-lg hover:border-primary-300 hover:text-primary-600 transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                Browse Docs
              </Link>
              <Link
                href="/support/ticket"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-surface-600 bg-white border border-surface-200 rounded-lg hover:border-primary-300 hover:text-primary-600 transition-colors"
              >
                <Ticket className="w-4 h-4" />
                Submit Ticket
              </Link>
              <Link
                href={hero.ctaUrl}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
              >
                {hero.cta}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div>
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-surface-900">
              Browse by Category
            </h2>
            <p className="mt-3 text-surface-600">
              Find what you need in our organized documentation library
            </p>
          </div>

          {isLoadingCategories ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12 text-surface-500">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No categories found. Add categories in Contentstack CMS.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category, index) => {
                const IconComponent = iconMap[category.icon] || FileText;
                const bgColor = colorMap[category.color] || 'bg-primary-500';
                return (
                  <motion.div 
                    key={category.uid}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      href={`/docs?category=${category.slug}`}
                      className="block p-6 bg-white rounded-2xl border border-surface-200 card-hover group"
                    >
                      <div className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-surface-900 group-hover:text-primary-600 transition-colors">
                        {category.title}
                      </h3>
                      <p className="mt-2 text-sm text-surface-600">
                        {category.description}
                      </p>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-xs font-medium text-surface-500">
                          {category.article_count} articles
                        </span>
                        <ArrowRight className="w-4 h-4 text-surface-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Personalized Recommendations */}
      <PersonalizedRecommendations />

      {/* Features Section */}
      <section className="bg-surface-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div variants={itemVariants} className="text-center mb-16">
              <h2 className="font-display text-3xl font-bold">
                Smart Support, Personalized for You
              </h2>
              <p className="mt-3 text-surface-400 max-w-2xl mx-auto">
                Our support portal learns from your interactions to provide relevant content and faster resolutions.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <motion.div variants={itemVariants} className="text-center">
                <div className="w-14 h-14 bg-primary-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <Zap className="w-7 h-7 text-primary-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Instant Answers</h3>
                <p className="text-surface-400 text-sm">
                  AI-powered search that understands your questions and finds relevant documentation instantly.
                </p>
              </motion.div>

              <motion.div variants={itemVariants} className="text-center">
                <div className="w-14 h-14 bg-accent-mint/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <Shield className="w-7 h-7 text-accent-mint" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Personalized Experience</h3>
                <p className="text-surface-400 text-sm">
                  Content recommendations tailored to your role, interests, and support history.
                </p>
              </motion.div>

              <motion.div variants={itemVariants} className="text-center">
                <div className="w-14 h-14 bg-accent-amber/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <MessageCircle className="w-7 h-7 text-accent-amber" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Quick Resolutions</h3>
                <p className="text-surface-400 text-sm">
                  Smart ticket routing and suggested solutions based on similar issues.
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative overflow-hidden bg-gradient-to-br from-primary-600 to-primary-800 rounded-3xl p-8 md:p-12 text-center text-white"
        >
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent-coral/20 rounded-full blur-2xl" />
          
          <div className="relative">
            <h2 className="font-display text-3xl md:text-4xl font-bold">
              Can&apos;t find what you&apos;re looking for?
            </h2>
            <p className="mt-4 text-lg text-primary-100 max-w-2xl mx-auto">
              Our support team is ready to help. Submit a ticket and we&apos;ll get back to you within 24 hours.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/support/ticket"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary-700 font-semibold rounded-xl hover:bg-primary-50 transition-colors shadow-lg"
              >
                <Ticket className="w-5 h-5" />
                Submit a Ticket
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 px-8 py-4 bg-primary-700/50 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors border border-primary-500"
              >
                Browse Documentation
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

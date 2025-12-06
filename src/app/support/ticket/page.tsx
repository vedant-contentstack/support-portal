'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  Ticket,
  Send,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  User,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { trackTicketSubmission, trackEvent } from '@/lib/lytics';
import { useLytics } from '@/components/LyticsProvider';
import { LyticsMetaTags } from '@/components/LyticsMetaTags';
import { 
  getTicketCategories, 
  getArticlesByTags,
  type Article,
  type TicketCategory,
} from '@/lib/contentstack';

// Default categories if CMS doesn't have them
const defaultCategories = [
  { id: 'technical', label: 'Technical Issue', description: 'Bugs, errors, or unexpected behavior' },
  { id: 'billing', label: 'Billing & Payments', description: 'Invoices, subscriptions, or payment issues' },
  { id: 'account', label: 'Account Access', description: 'Login problems or account settings' },
  { id: 'feature', label: 'Feature Request', description: 'Suggestions for new features' },
  { id: 'integration', label: 'Integration Help', description: 'API, webhooks, or third-party connections' },
  { id: 'other', label: 'Other', description: 'General questions or feedback' },
];

const priorities = [
  { id: 'low', label: 'Low', description: 'General question, no urgency', color: 'text-accent-mint bg-accent-mint/10' },
  { id: 'medium', label: 'Medium', description: 'Issue affecting work, but have workaround', color: 'text-accent-amber bg-accent-amber/10' },
  { id: 'high', label: 'High', description: 'Significant impact, blocking some work', color: 'text-orange-500 bg-orange-500/10' },
  { id: 'urgent', label: 'Urgent', description: 'Critical issue, completely blocked', color: 'text-accent-coral bg-accent-coral/10' },
];

// Category to tags mapping for fetching relevant articles
const categoryTagsMap: Record<string, string[]> = {
  technical: ['troubleshooting', 'error', 'bug', 'technical'],
  billing: ['billing', 'payment', 'invoice', 'subscription'],
  account: ['account', 'login', 'password', 'security', 'profile'],
  integration: ['api', 'integration', 'webhook', 'sdk', 'developer'],
  feature: ['feature', 'roadmap', 'release'],
  other: ['getting-started', 'overview', 'guide'],
};

interface CategoryOption {
  id: string;
  label: string;
  description: string;
  suggestedArticles?: Article[];
}

export default function TicketPage() {
  const { profile } = useLytics();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: '',
    priority: 'medium',
    subject: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [categories, setCategories] = useState<CategoryOption[]>(defaultCategories);
  const [suggestedArticles, setSuggestedArticles] = useState<Article[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Load categories from CMS
  useEffect(() => {
    async function loadCategories() {
      try {
        const cmsCategories = await getTicketCategories();
        if (cmsCategories.length > 0) {
          setCategories(cmsCategories.map(cat => ({
            id: cat.category_id,
            label: cat.label,
            description: cat.description,
            suggestedArticles: cat.suggested_articles,
          })));
        }
      } catch (error) {
        console.error('Error loading categories:', error);
        // Keep default categories
      }
    }
    loadCategories();
  }, []);

  useEffect(() => {
    trackEvent('ticket_page_view', {});
    
    // Pre-fill if user is identified
    if (profile?.email) {
      setFormData(prev => ({
        ...prev,
        email: profile.email || '',
        name: profile.name || '',
      }));
    }
  }, [profile]);

  // Load suggestions when category is selected
  useEffect(() => {
    async function loadSuggestions() {
      if (!formData.category) {
        setSuggestedArticles([]);
        return;
      }

      setIsLoadingSuggestions(true);
      setShowSuggestions(true);
      trackEvent('ticket_category_selected', { category: formData.category });

      try {
        // First check if category has pre-configured suggestions
        const categoryData = categories.find(c => c.id === formData.category);
        if (categoryData?.suggestedArticles && categoryData.suggestedArticles.length > 0) {
          setSuggestedArticles(categoryData.suggestedArticles);
        } else {
          // Fetch articles by tags
          const tags = categoryTagsMap[formData.category] || ['help', 'guide'];
          const articles = await getArticlesByTags(tags, 3);
          setSuggestedArticles(articles);
        }
      } catch (error) {
        console.error('Error loading suggestions:', error);
        setSuggestedArticles([]);
      }

      setIsLoadingSuggestions(false);
    }

    loadSuggestions();
  }, [formData.category, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Call the ticket API
      const response = await fetch('/api/ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (data.success) {
        setTicketId(data.ticket_id);
      } else {
        // Generate fallback ticket ID
        setTicketId(`TKT-${Date.now().toString(36).toUpperCase()}`);
      }
    } catch (error) {
      console.error('Error submitting ticket:', error);
      // Generate fallback ticket ID
      setTicketId(`TKT-${Date.now().toString(36).toUpperCase()}`);
    }

    // Track ticket submission in Lytics (includes user info)
    trackTicketSubmission({
      category: formData.category,
      priority: formData.priority,
      subject: formData.subject,
      email: formData.email,
      name: formData.name,
    });

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full bg-white rounded-2xl border border-surface-200 p-8 text-center"
        >
          <div className="w-16 h-16 bg-accent-mint/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-accent-mint" />
          </div>
          <h1 className="font-display text-2xl font-bold text-surface-900 mb-2">
            Ticket Submitted!
          </h1>
          <p className="text-surface-600 mb-6">
            We&apos;ve received your support request and will get back to you within 24 hours.
          </p>
          
          <div className="bg-surface-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-surface-500 mb-1">Your ticket ID</p>
            <p className="font-mono text-lg font-semibold text-surface-900">{ticketId}</p>
          </div>

          <p className="text-sm text-surface-500 mb-6">
            A confirmation email has been sent to <span className="font-medium">{formData.email}</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/docs"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-surface-100 text-surface-700 rounded-xl font-medium hover:bg-surface-200 transition-colors"
            >
              <FileText className="w-5 h-5" />
              Browse Docs
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
            >
              Go Home
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Topics based on selected category
  const supportTopics = formData.category 
    ? ['support', 'ticket', formData.category, 'help']
    : ['support', 'ticket', 'help', 'contact'];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Lytics Content Affinity Meta Tags */}
      <LyticsMetaTags
        topics={supportTopics}
        contentType="support-form"
        category={formData.category || 'support'}
        title="Submit Support Ticket"
      />
      
      {/* Header */}
      <div className="bg-white border-b border-surface-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 text-sm text-surface-500 mb-4">
              <Link href="/" className="hover:text-primary-600 transition-colors">Home</Link>
              <ChevronRight className="w-4 h-4" />
              <Link href="/support/ticket" className="hover:text-primary-600 transition-colors">Support</Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-surface-900">Submit Ticket</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center">
                <Ticket className="w-7 h-7 text-primary-600" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold text-surface-900">
                  Submit a Support Ticket
                </h1>
                <p className="mt-1 text-surface-600">
                  Describe your issue and we&apos;ll help you resolve it quickly.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact Info */}
              <div className="bg-white rounded-2xl border border-surface-200 p-6">
                <h2 className="font-semibold text-surface-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary-500" />
                  Contact Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-surface-700 mb-1.5">
                      Your Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-surface-700 mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Category */}
              <div className="bg-white rounded-2xl border border-surface-200 p-6">
                <h2 className="font-semibold text-surface-900 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary-500" />
                  Issue Category
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categories.map((cat) => (
                    <label
                      key={cat.id}
                      className={`relative flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        formData.category === cat.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-surface-200 hover:border-surface-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="category"
                        value={cat.id}
                        checked={formData.category === cat.id}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <div>
                        <span className={`font-medium ${
                          formData.category === cat.id ? 'text-primary-900' : 'text-surface-900'
                        }`}>
                          {cat.label}
                        </span>
                        <span className="block text-xs text-surface-500 mt-0.5">
                          {cat.description}
                        </span>
                      </div>
                      {formData.category === cat.id && (
                        <CheckCircle className="absolute top-3 right-3 w-5 h-5 text-primary-500" />
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div className="bg-white rounded-2xl border border-surface-200 p-6">
                <h2 className="font-semibold text-surface-900 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-primary-500" />
                  Priority Level
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {priorities.map((pri) => (
                    <label
                      key={pri.id}
                      className={`relative flex flex-col items-center p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        formData.priority === pri.id
                          ? 'border-primary-500'
                          : 'border-surface-200 hover:border-surface-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="priority"
                        value={pri.id}
                        checked={formData.priority === pri.id}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${pri.color}`}>
                        {pri.label}
                      </span>
                      <span className="text-xs text-surface-500 mt-2 text-center">
                        {pri.description}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Details */}
              <div className="bg-white rounded-2xl border border-surface-200 p-6">
                <h2 className="font-semibold text-surface-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary-500" />
                  Issue Details
                </h2>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-surface-700 mb-1.5">
                      Subject
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      placeholder="Brief description of your issue"
                    />
                  </div>
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-surface-700 mb-1.5">
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      required
                      rows={6}
                      className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
                      placeholder="Please provide as much detail as possible about your issue, including any steps to reproduce it..."
                    />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting || !formData.category}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Ticket
                  </>
                )}
              </button>
            </form>
          </motion.div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Suggested Articles */}
            {showSuggestions && formData.category && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-2xl border border-surface-200 p-5"
              >
                <h3 className="font-semibold text-surface-900 mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent-amber" />
                  Before you submit...
                </h3>
                <p className="text-sm text-surface-600 mb-4">
                  These articles might help resolve your issue:
                </p>
                
                {isLoadingSuggestions ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 text-surface-400 animate-spin" />
                  </div>
                ) : suggestedArticles.length > 0 ? (
                  <div className="space-y-2">
                    {suggestedArticles.map((article) => (
                      <Link
                        key={article.uid}
                        href={`/docs/${article.slug}`}
                        className="flex items-center gap-2 p-2 text-sm text-surface-700 hover:text-primary-600 hover:bg-surface-50 rounded-lg transition-colors"
                      >
                        <FileText className="w-4 h-4 text-surface-400" />
                        {article.title}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-surface-500 py-2">
                    No specific articles found. Feel free to submit your ticket.
                  </p>
                )}
              </motion.div>
            )}

            {/* Response Time */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl border border-surface-200 p-5"
            >
              <h3 className="font-semibold text-surface-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary-500" />
                Response Times
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-surface-600">Urgent</span>
                  <span className="font-medium text-surface-900">2-4 hours</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-surface-600">High</span>
                  <span className="font-medium text-surface-900">8-12 hours</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-surface-600">Medium</span>
                  <span className="font-medium text-surface-900">24 hours</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-surface-600">Low</span>
                  <span className="font-medium text-surface-900">48 hours</span>
                </div>
              </div>
            </motion.div>

            {/* Tips */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-primary-50 rounded-2xl p-5"
            >
              <h3 className="font-semibold text-primary-900 mb-3">
                Tips for faster resolution
              </h3>
              <ul className="space-y-2 text-sm text-primary-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  Include specific error messages
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  Describe steps to reproduce
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  Mention browser/device info
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  Attach screenshots if helpful
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { PersonalizationBanner } from "@/components/PersonalizationBanner";

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

const statusColors: Record<string, string> = {
  New: "bg-blue-500",
  "Waiting on contact": "bg-amber-500",
  "Waiting on us": "bg-purple-500",
  Closed: "bg-green-500",
  Open: "bg-blue-400",
};

const priorityColors: Record<string, string> = {
  low: "text-green-600 border-green-300 bg-green-50",
  medium: "text-amber-600 border-amber-300 bg-amber-50",
  high: "text-red-600 border-red-300 bg-red-50",
};

export default function TicketsPage() {
  const [email, setEmail] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Start loading
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);

  const fetchTicketsForEmail = async (userEmail: string) => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await fetch(
        `/api/ticket?email=${encodeURIComponent(userEmail)}`
      );
      const data = await response.json();

      if (data.success) {
        setTickets(data.tickets);
      } else {
        setError(data.error || "Failed to fetch tickets");
      }
    } catch (err) {
      console.error("Error fetching tickets:", err);
      setError("Failed to connect to server");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fetch tickets if email exists in localStorage
  useEffect(() => {
    const savedEmail = localStorage.getItem("user_email");
    if (savedEmail) {
      setEmail(savedEmail);
      fetchTicketsForEmail(savedEmail);
    } else {
      setIsLoading(false); // No email, stop loading
    }
  }, []);

  const fetchTickets = async () => {
    if (!email.trim()) return;
    localStorage.setItem("user_email", email);
    fetchTicketsForEmail(email);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <PersonalizationBanner />
      
      {/* Header */}
      <div className="bg-white border-b border-surface-200">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/support/ticket"
              className="text-surface-500 hover:text-primary-600 transition-colors"
            >
              ← Back to Submit Ticket
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-surface-900">My Support Tickets</h1>
          <p className="text-surface-600 mt-2">
            View and track the status of your support requests
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Email Display/Search */}
        {hasSearched && email && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-surface-200 p-4 mb-8 shadow-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-surface-500">Showing tickets for</p>
                <p className="font-medium text-surface-900">{email}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setEmail("");
                setTickets([]);
                setHasSearched(false);
                localStorage.removeItem("user_email");
              }}
              className="text-sm text-surface-500 hover:text-primary-600 transition-colors"
            >
              Change email
            </button>
          </motion.div>
        )}

        {/* Email Input - only show if not searched yet */}
        {!hasSearched && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-surface-200 p-6 mb-8 shadow-sm"
          >
            <label className="block text-sm font-medium text-surface-700 mb-2">
              Enter your email to view tickets
            </label>
            <div className="flex gap-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchTickets()}
                placeholder="your@email.com"
                className="flex-1 bg-surface-50 border border-surface-300 rounded-lg px-4 py-3 text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                onClick={fetchTickets}
                disabled={isLoading || !email.trim()}
                className="px-6 py-3 bg-primary-600 hover:bg-primary-500 disabled:bg-surface-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Loading...
                </span>
              ) : (
                "View Tickets"
              )}
            </button>
          </div>
        </motion.div>
        )}

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8 text-red-600"
          >
            {error}
          </motion.div>
        )}

        {/* Tickets List */}
        {hasSearched && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {tickets.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-xl font-semibold text-surface-900 mb-2">
                  No tickets found
                </h3>
                <p className="text-surface-500 mb-6">
                  We couldn&apos;t find any support tickets for this email
                </p>
                <Link
                  href="/support/ticket"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white font-medium rounded-lg transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Submit a New Ticket
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-surface-900">
                    {tickets.length} Ticket{tickets.length !== 1 ? "s" : ""} Found
                  </h2>
                  <Link
                    href="/support/ticket"
                    className="text-primary-600 hover:text-primary-500 text-sm flex items-center gap-1"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    New Ticket
                  </Link>
                </div>

                <AnimatePresence>
                  {tickets.map((ticket, index) => (
                    <motion.div
                      key={ticket.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white rounded-xl border border-surface-200 overflow-hidden hover:border-surface-300 hover:shadow-md transition-all"
                    >
                      <div
                        className="p-5 cursor-pointer"
                        onClick={() =>
                          setExpandedTicket(
                            expandedTicket === ticket.id ? null : ticket.id
                          )
                        }
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <span
                                className={`px-2 py-0.5 text-xs font-medium text-white rounded-full ${
                                  statusColors[ticket.status] || "bg-slate-500"
                                }`}
                              >
                                {ticket.status}
                              </span>
                              <span
                                className={`px-2 py-0.5 text-xs font-medium border rounded-full ${
                                  priorityColors[ticket.priority] ||
                                  "text-slate-400 border-slate-400/30"
                                }`}
                              >
                                {ticket.priority.toUpperCase()}
                              </span>
                              <span className="text-xs text-surface-500">
                                {ticket.category}
                              </span>
                            </div>
                            <h3 className="text-lg font-medium text-surface-900 truncate">
                              {ticket.subject}
                            </h3>
                            <p className="text-sm text-surface-500 mt-1">
                              Created {formatDate(ticket.createdAt)}
                            </p>
                          </div>
                          <motion.div
                            animate={{
                              rotate: expandedTicket === ticket.id ? 180 : 0,
                            }}
                            className="text-surface-400"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </motion.div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {expandedTicket === ticket.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 pb-5 pt-2 border-t border-surface-100">
                              <div className="bg-surface-50 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-surface-700 mb-2">
                                  Description
                                </h4>
                                <p className="text-surface-600 text-sm whitespace-pre-wrap">
                                  {ticket.description || "No description provided"}
                                </p>
                              </div>
                              <div className="mt-4 flex items-center justify-between text-sm">
                                <span className="text-surface-500">
                                  Ticket ID: {ticket.id}
                                </span>
                                <span className="text-surface-500">
                                  Last updated: {formatDate(ticket.updatedAt)}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}

        {/* Initial State */}
        {!hasSearched && !isLoading && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎫</div>
            <h3 className="text-xl font-semibold text-surface-900 mb-2">
              View Your Tickets
            </h3>
            <p className="text-surface-500">
              Enter your email address above to see your support tickets
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


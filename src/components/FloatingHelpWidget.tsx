"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  FileText,
  Headphones,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import {
  initPersonalize,
  getExperiences,
  getVariantAliases,
  triggerImpression,
} from "@/lib/personalize";
import { getHelpWidget, HelpWidgetContent } from "@/lib/contentstack";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  send: Send,
  file: FileText,
  headphones: Headphones,
  help: HelpCircle,
  message: MessageCircle,
};

export function FloatingHelpWidget() {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [content, setContent] = useState<HelpWidgetContent | null>(null);
  const [experienceUid, setExperienceUid] = useState<string | null>(null);

  useEffect(() => {
    // Check if dismissed this session
    const dismissed = sessionStorage.getItem("help_widget_dismissed");
    if (dismissed) return;

    async function loadWidgetContent() {
      console.log("[HelpWidget] ========== loadWidgetContent START ==========");
      let variantAliases: string[] = [];
      let activeExperienceUid: string | null = null;

      // Get variant aliases from Contentstack Personalize
      try {
        console.log("[HelpWidget] Step 1: Initializing Personalize SDK...");
        const sdk = await initPersonalize();
        console.log("[HelpWidget] SDK result:", sdk ? "initialized" : "null");

        if (sdk) {
          console.log(
            "[HelpWidget] Step 2: Getting experiences from manifest..."
          );
          const experiences = await getExperiences();
          console.log(
            "[HelpWidget] Experiences:",
            JSON.stringify(experiences, null, 2)
          );

          // Find experience for help widget (could be any experience targeting struggling_users)
          // We look for experiences other than the banner one (shortUid "0")
          const helpExperience = experiences.find(
            (exp) => exp.activeVariantShortUid !== null
          );

          if (helpExperience) {
            console.log(
              "[HelpWidget] Step 3: Found active experience:",
              helpExperience
            );
            activeExperienceUid = helpExperience.shortUid;
            setExperienceUid(activeExperienceUid);

            console.log("[HelpWidget] Step 4: Getting variant aliases...");
            variantAliases = await getVariantAliases();
            console.log("[HelpWidget] Variant aliases:", variantAliases);
          } else {
            console.log(
              "[HelpWidget] No active experience, will fetch base entry"
            );
          }
        } else {
          console.log("[HelpWidget] SDK not initialized");
        }
      } catch (error) {
        console.error("[HelpWidget] Error getting personalize data:", error);
      }

      // Fetch help widget content from CMS (with or without variant aliases)
      try {
        console.log("[HelpWidget] Step 5: Fetching widget content from CMS...");
        console.log("[HelpWidget] Using variant aliases:", variantAliases);

        const widget = await getHelpWidget(variantAliases);
        console.log("[HelpWidget] Widget from CMS:", widget);

        if (widget) {
          // Only show if show_widget is true (controlled by CMS)
          if (widget.show_widget) {
            console.log("[HelpWidget] ✅ Widget enabled, setting content!");
            setContent(widget);
            setIsVisible(true);

            // Track impression if an active experience was found
            if (activeExperienceUid) {
              console.log(
                "[HelpWidget] Step 6: Triggering impression for:",
                activeExperienceUid
              );
              await triggerImpression(activeExperienceUid);
            }
          } else {
            console.log(
              "[HelpWidget] ⚠️ Widget disabled via show_widget field"
            );
          }
        } else {
          console.log("[HelpWidget] ⚠️ No widget content returned from CMS");
        }
      } catch (error) {
        console.error("[HelpWidget] ❌ Error fetching widget from CMS:", error);
      }

      console.log("[HelpWidget] ========== loadWidgetContent END ==========");
    }

    loadWidgetContent();
  }, []);

  const handleDismiss = () => {
    setIsExpanded(false);
    setIsVisible(false);
    sessionStorage.setItem("help_widget_dismissed", "true");
  };

  if (!isVisible || !content) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          // Collapsed state - floating button
          <motion.button
            key="collapsed"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsExpanded(true)}
            className="relative group"
          >
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full bg-primary-500 animate-ping opacity-25" />

            {/* Button */}
            <div className="relative flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 text-white px-5 py-3 rounded-full shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-shadow">
              <MessageCircle className="w-5 h-5" />
              <span className="font-medium">{content.button_text}</span>
            </div>

            {/* Tooltip on hover */}
            <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="bg-surface-900 text-white text-sm px-3 py-1.5 rounded-lg whitespace-nowrap">
                {content.subtitle}
              </div>
            </div>
          </motion.button>
        ) : (
          // Expanded state - help panel
          <motion.div
            key="expanded"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl border border-surface-200 w-80 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-500 text-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{content.title}</h3>
                  <p className="text-primary-100 text-sm">{content.subtitle}</p>
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="p-3 space-y-2">
              {content.help_options?.map((option, index) => {
                const IconComponent = iconMap[option.icon] || Send;
                return (
                  <Link
                    key={index}
                    href={option.url}
                    onClick={() => setIsExpanded(false)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-50 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-surface-900">
                        {option.label}
                      </div>
                      <div className="text-sm text-surface-500">
                        {option.description}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-surface-400 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all" />
                  </Link>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-surface-50 border-t border-surface-100">
              <button
                onClick={handleDismiss}
                className="text-sm text-surface-500 hover:text-surface-700 transition-colors"
              >
                Don&apos;t show this again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

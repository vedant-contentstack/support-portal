"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Sparkles, ArrowRight, Clock, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  initPersonalize,
  getVariantAliases,
  getExperiences,
  triggerImpression,
} from "@/lib/personalize";
import { getPersonalizedBanner } from "@/lib/contentstack";

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  sparkles: Sparkles,
  clock: Clock,
  alert: AlertCircle,
};

export function PersonalizationBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [bannerContent, setBannerContent] = useState<{
    message: string;
    link: string;
    icon: string;
    bgClass: string;
    experienceUid?: string;
  } | null>(null);

  useEffect(() => {
    // Check if user has dismissed banner recently
    const dismissed = sessionStorage.getItem("banner_dismissed");
    if (dismissed) {
      return;
    }

    async function loadBannerContent() {
      let variantAliases: string[] = [];
      let activeExperienceUid: string | undefined;

      // Try to get variant aliases from Contentstack Personalize
      try {
        const sdk = await initPersonalize();

        if (sdk) {
          // Get all experiences from manifest
          const experiences = await getExperiences();

          // Find first experience with an active variant
          const activeExperience = experiences.find(
            (exp) => exp.activeVariantShortUid !== null
          );

          if (activeExperience) {
            activeExperienceUid = activeExperience.shortUid;

            // Get variant aliases to pass to CMS
            variantAliases = await getVariantAliases();
          } else {
            console.log("[Banner] No active experience, will fetch base entry");
          }
        }
      } catch (error) {
        console.error("[Banner] Error getting personalize data:", error);
      }

      // Fetch banner from CMS (with or without variant aliases)
      // If variant aliases exist, we get the variant; otherwise we get the base entry
      try {
        const banner = await getPersonalizedBanner(variantAliases);

        if (banner) {
          // Handle empty strings as well as null/undefined
          const bgColor =
            banner.bg_color && banner.bg_color.trim()
              ? banner.bg_color
              : "bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600";
          const icon =
            banner.icon && banner.icon.trim() ? banner.icon : "sparkles";

          setBannerContent({
            message: banner.message,
            link: banner.cta_url,
            icon: icon,
            bgClass: bgColor,
            experienceUid: activeExperienceUid,
          });
          setIsVisible(true);

          // Track impression if we have an active experience
          if (activeExperienceUid) {
            await triggerImpression(activeExperienceUid);
          }
        } else {
          console.log("[Banner] ⚠️ No banner found in CMS");
        }
      } catch (error) {
        console.error("[Banner] ❌ Error fetching banner from CMS:", error);
      }

      console.log("[Banner] ========== loadBannerContent END ==========");
    }

    loadBannerContent();
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem("banner_dismissed", "true");
  };

  if (!bannerContent || !isVisible) return null;

  const IconComponent = iconMap[bannerContent.icon] || Sparkles;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className={`${bannerContent.bgClass} text-white overflow-hidden`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2.5">
            <Link
              href={bannerContent.link}
              className="flex items-center gap-2 text-sm font-medium hover:text-white/90 transition-colors group"
            >
              <IconComponent className="w-4 h-4" />
              <span>{bannerContent.message}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

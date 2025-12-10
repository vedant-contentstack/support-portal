"use client";

import { useState, useEffect } from "react";
import { AIChat, AIChatTrigger } from "./AIChat";
import {
  initPersonalize,
  getExperiences,
  getVariantAliases,
  triggerImpression,
} from "@/lib/personalize";
import { getHelpWidget } from "@/lib/contentstack";

export function AIChatWrapper() {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const [experienceUid, setExperienceUid] = useState<string | null>(null);

  useEffect(() => {
    // Check if dismissed this session
    const dismissed = sessionStorage.getItem("ai_chat_dismissed");
    if (dismissed) return;

    async function checkEligibility() {
      console.log("[AIChat] Checking eligibility via Personalize...");
      let variantAliases: string[] = [];
      let activeExperienceUid: string | null = null;

      // Get variant aliases from Contentstack Personalize
      try {
        const sdk = await initPersonalize();

        if (sdk) {
          const experiences = await getExperiences();
          console.log("[AIChat] Experiences:", experiences);

          // Find experience with active variant
          const activeExperience = experiences.find(
            (exp) => exp.activeVariantShortUid !== null
          );

          if (activeExperience) {
            console.log("[AIChat] Found active experience:", activeExperience);
            activeExperienceUid = activeExperience.shortUid;
            setExperienceUid(activeExperienceUid);

            variantAliases = await getVariantAliases();
            console.log("[AIChat] Variant aliases:", variantAliases);
          } else {
            console.log("[AIChat] No active experience, will fetch base entry");
          }
        }
      } catch (error) {
        console.error("[AIChat] Personalize error:", error);
      }

      // Fetch help_widget content from CMS
      try {
        console.log("[AIChat] Fetching help_widget from CMS...");
        const widget = await getHelpWidget(variantAliases);
        console.log("[AIChat] Widget content:", widget);

        if (widget && widget.show_widget) {
          console.log("[AIChat] ✅ Widget enabled, showing AI Chat!");
          setShouldShow(true);

          // Track impression
          if (activeExperienceUid) {
            await triggerImpression(activeExperienceUid);
          }
        } else {
          console.log("[AIChat] Widget disabled (show_widget=false)");
        }
      } catch (error) {
        console.error("[AIChat] Error fetching widget:", error);
      }
    }

    checkEligibility();
  }, []);

  const handleDismiss = () => {
    setIsOpen(false);
    setShouldShow(false);
    sessionStorage.setItem("ai_chat_dismissed", "true");
  };

  // Don't render anything if not eligible
  if (!shouldShow) return null;

  return (
    <>
      {!isOpen && <AIChatTrigger onClick={() => setIsOpen(true)} />}
      <AIChat isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

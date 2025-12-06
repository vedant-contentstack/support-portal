// Contentstack Personalize Edge SDK Integration
// Docs: https://www.contentstack.com/docs/developers/sdks/personalize-edge-sdk/javascript/reference

import Personalize from "@contentstack/personalize-edge-sdk";
import { getPrimarySegment, type UserProfile } from "./lytics";

// SDK type
type PersonalizeSdk = Awaited<ReturnType<typeof Personalize.init>>;

// SDK instance (initialized once)
let sdkInstance: PersonalizeSdk | null = null;
let initializationPromise: Promise<PersonalizeSdk | null> | null = null;

// Configuration
const PROJECT_UID = process.env.NEXT_PUBLIC_PERSONALIZE_PROJECT_UID || "";
const EDGE_API_URL =
  process.env.NEXT_PUBLIC_PERSONALIZE_EDGE_API_URL ||
  "https://personalize-edge.contentstack.com";

/**
 * Check if Personalize is configured
 */
export function isPersonalizeConfigured(): boolean {
  return Boolean(PROJECT_UID && PROJECT_UID.length > 0);
}

/**
 * Initialize the Personalize Edge SDK
 * Returns SDK instance for accessing variants and tracking
 */
export async function initPersonalize(): Promise<PersonalizeSdk | null> {
  console.log("[Personalize] initPersonalize called");

  if (typeof window === "undefined") {
    console.log("[Personalize] Skipping - server side");
    return null;
  }

  if (!isPersonalizeConfigured()) {
    console.warn(
      "[Personalize] Project UID not configured. Set NEXT_PUBLIC_PERSONALIZE_PROJECT_UID"
    );
    return null;
  }

  console.log("[Personalize] Project UID:", PROJECT_UID);
  console.log("[Personalize] Edge API URL:", EDGE_API_URL);

  // Return existing instance if already initialized
  if (sdkInstance) {
    console.log("[Personalize] Returning existing SDK instance");
    return sdkInstance;
  }

  // Return existing promise if initialization is in progress
  if (initializationPromise) {
    console.log("[Personalize] Initialization in progress, waiting...");
    return initializationPromise;
  }

  // Initialize SDK
  initializationPromise = (async () => {
    try {
      // Set edge API URL if not default NA region
      if (EDGE_API_URL !== "https://personalize-edge.contentstack.com") {
        console.log("[Personalize] Setting custom Edge API URL:", EDGE_API_URL);
        Personalize.setEdgeApiUrl(EDGE_API_URL);
      }

      console.log("[Personalize] Calling Personalize.init...");
      // Initialize SDK
      sdkInstance = await Personalize.init(PROJECT_UID);
      console.log("[Personalize] SDK initialized successfully!", sdkInstance);
      return sdkInstance;
    } catch (error) {
      console.error("[Personalize] Error initializing SDK:", error);
      initializationPromise = null;
      return null;
    }
  })();

  return initializationPromise;
}

/**
 * Get the SDK instance (initializes if needed)
 */
export async function getPersonalizeSdk(): Promise<PersonalizeSdk | null> {
  return initPersonalize();
}

/**
 * Get all experiences with their active variants
 * Returns list of { shortUid, activeVariantShortUid }
 */
export async function getExperiences(): Promise<
  Array<{ shortUid: string; activeVariantShortUid: string | null }>
> {
  console.log("[Personalize] getExperiences called");
  const sdk = await getPersonalizeSdk();
  if (!sdk) {
    console.log("[Personalize] No SDK instance available");
    return [];
  }

  try {
    const experiences = sdk.getExperiences();
    console.log("[Personalize] Experiences:", experiences);
    return experiences;
  } catch (error) {
    console.error("[Personalize] Error getting experiences:", error);
    return [];
  }
}

/**
 * Get active variant for a specific experience
 */
export async function getActiveVariant(
  experienceShortUid: string
): Promise<string | null> {
  console.log("[Personalize] getActiveVariant called for:", experienceShortUid);
  const sdk = await getPersonalizeSdk();
  if (!sdk) {
    console.log("[Personalize] No SDK instance available");
    return null;
  }

  try {
    const variant = sdk.getActiveVariant(experienceShortUid);
    console.log(
      "[Personalize] Active variant for",
      experienceShortUid,
      ":",
      variant
    );
    return variant;
  } catch (error) {
    console.error("[Personalize] Error getting active variant:", error);
    return null;
  }
}

/**
 * Get variant aliases for CMS Delivery API
 * Returns aliases like ['cs_personalize_a_0', 'cs_personalize_b_1']
 * Pass these to Contentstack Delivery API to fetch personalized entries
 */
export async function getVariantAliases(): Promise<string[]> {
  console.log("[Personalize] getVariantAliases called");
  const sdk = await getPersonalizeSdk();
  if (!sdk) {
    console.log("[Personalize] No SDK instance available");
    return [];
  }

  try {
    const aliases = sdk.getVariantAliases();
    console.log("[Personalize] Variant aliases:", aliases);
    return aliases;
  } catch (error) {
    console.error("[Personalize] Error getting variant aliases:", error);
    return [];
  }
}

/**
 * Get variants as key-value pairs
 * Returns { experienceShortUid: variantShortUid }
 */
export async function getVariants(): Promise<Record<string, string>> {
  console.log("[Personalize] getVariants called");
  const sdk = await getPersonalizeSdk();
  if (!sdk) {
    console.log("[Personalize] No SDK instance available");
    return {};
  }

  try {
    const variants = sdk.getVariants();
    console.log("[Personalize] Variants:", variants);
    return variants;
  } catch (error) {
    console.error("[Personalize] Error getting variants:", error);
    return {};
  }
}

/**
 * Trigger impression for an experience
 * Call this when showing personalized content to user
 */
export async function triggerImpression(
  experienceShortUid: string
): Promise<void> {
  const sdk = await getPersonalizeSdk();
  if (!sdk) return;

  try {
    await sdk.triggerImpression(experienceShortUid);
  } catch (error) {
    console.error("Error triggering impression:", error);
  }
}

/**
 * Trigger multiple impressions at once
 */
export async function triggerImpressions(
  experienceShortUids: string[]
): Promise<void> {
  const sdk = await getPersonalizeSdk();
  if (!sdk) return;

  try {
    await sdk.triggerImpressions({ experienceShortUids });
  } catch (error) {
    console.error("Error triggering impressions:", error);
  }
}

/**
 * Trigger a custom event (for conversions, CTAs, etc.)
 */
export async function triggerEvent(eventKey: string): Promise<void> {
  const sdk = await getPersonalizeSdk();
  if (!sdk) return;

  try {
    await sdk.triggerEvent(eventKey);
  } catch (error) {
    console.error("Error triggering event:", error);
  }
}

/**
 * Set user attributes for personalization
 * Attributes must be pre-configured in Personalize project
 */
export async function setAttributes(
  attributes: Record<string, string | number | boolean | string[]>
): Promise<void> {
  const sdk = await getPersonalizeSdk();
  if (!sdk) return;

  try {
    await sdk.set(attributes);
  } catch (error) {
    console.error("Error setting attributes:", error);
  }
}

/**
 * Set user ID for cross-device/session tracking
 */
export async function setUserId(
  userId: string,
  options?: { preserveUserAttributes?: boolean }
): Promise<void> {
  const sdk = await getPersonalizeSdk();
  if (!sdk) return;

  try {
    await sdk.setUserId(userId, options);
  } catch (error) {
    console.error("Error setting user ID:", error);
  }
}

/**
 * Sync Lytics profile to Personalize attributes
 */
export async function syncLyticsToPersonalize(
  profile: UserProfile
): Promise<void> {
  const segment = getPrimarySegment(profile);

  await setAttributes({
    lytics_segment: segment,
    interests: profile.interests,
    content_affinities: profile.contentAffinities,
    engagement_score: profile.engagementScore,
    visit_count: profile.visitCount,
  });
}

// ============================================
// Legacy exports for backward compatibility
// ============================================

export async function getPersonalizedVariant(
  experienceShortUid: string
): Promise<string | null> {
  return getActiveVariant(experienceShortUid);
}

export function trackVariantImpression(
  experienceShortUid: string,
  _variantShortUid: string
): void {
  triggerImpression(experienceShortUid);
}

export function trackConversion(eventKey: string): void {
  triggerEvent(eventKey);
}

// ============================================
// Local personalization fallback (no SDK)
// ============================================

export interface PersonalizationContext {
  section: "hero" | "recommendations" | "cta" | "banner";
  profile: UserProfile;
}

interface PersonalizedContentResult {
  title?: string;
  subtitle?: string;
  cta?: string;
  ctaUrl?: string;
  text?: string;
  variant?: string;
  items?: string[];
  show?: boolean;
  message?: string;
  link?: string;
}

// Get personalized content based on local rules (fallback when SDK not available)
export function getPersonalizedContent(
  context: PersonalizationContext
): PersonalizedContentResult {
  const { section, profile } = context;
  const segment = getPrimarySegment(profile);

  const contentMap: Record<
    string,
    Record<string, PersonalizedContentResult>
  > = {
    hero: {
      new_visitor: {
        title: "Welcome to Support",
        subtitle: "Find answers fast with our comprehensive help center",
        cta: "Browse Popular Articles",
        ctaUrl: "/docs",
      },
      returning_user: {
        title: "Welcome Back!",
        subtitle: "Continue where you left off or explore new resources",
        cta: "View Recent Articles",
        ctaUrl: "/docs/recent",
      },
      power_user: {
        title: "Hello, Expert!",
        subtitle: "Jump into advanced documentation and API references",
        cta: "API Documentation",
        ctaUrl: "/docs/api",
      },
      frustrated_user: {
        title: "We're Here to Help",
        subtitle: "Get personalized support from our team",
        cta: "Contact Support",
        ctaUrl: "/support/ticket",
      },
      technical_user: {
        title: "Developer Resources",
        subtitle: "Integration guides, APIs, and technical documentation",
        cta: "View Integrations",
        ctaUrl: "/docs/integrations",
      },
    },
    recommendations: {
      new_visitor: {
        title: "Getting Started",
        items: ["quick-start", "first-steps", "overview"],
      },
      billing_interested: {
        title: "Billing & Payments",
        items: ["billing-overview", "payment-methods", "invoices"],
      },
      technical_user: {
        title: "Developer Guides",
        items: ["api-reference", "webhooks", "sdk-setup"],
      },
    },
    cta: {
      new_visitor: {
        text: "Start Your Journey",
        variant: "primary",
      },
      frustrated_user: {
        text: "Talk to a Human",
        variant: "urgent",
      },
      default: {
        text: "Get Help",
        variant: "default",
      },
    },
    banner: {
      new_visitor: {
        show: true,
        message: "👋 New here? Check out our quick start guide!",
        link: "/docs/quick-start",
      },
      frustrated_user: {
        show: true,
        message: "💬 Need immediate help? Our support team is online.",
        link: "/support/live-chat",
      },
    },
  };

  return (
    contentMap[section]?.[segment] || contentMap[section]?.["default"] || {}
  );
}

// A/B test variant selection (local)
export function selectABVariant<T>(variants: T[], testId: string): T {
  if (typeof window === "undefined") {
    return variants[0];
  }

  const storageKey = `ab_test_${testId}`;
  let assignment = localStorage.getItem(storageKey);

  if (!assignment) {
    const index = Math.floor(Math.random() * variants.length);
    assignment = index.toString();
    localStorage.setItem(storageKey, assignment);
  }

  return variants[parseInt(assignment, 10)] || variants[0];
}

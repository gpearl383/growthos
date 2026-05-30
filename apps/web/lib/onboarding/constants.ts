export type BusinessType =
  | "local_services"
  | "salon"
  | "food"
  | "professional"
  | "other";

export type TenantGoal =
  | "bookings"
  | "quotes"
  | "email_list"
  | "store_visits"
  | "followers";

export type LeadPageTemplate = "book" | "quote" | "guide";

export const BUSINESS_TYPES: {
  value: BusinessType;
  label: string;
  description: string;
}[] = [
  {
    value: "local_services",
    label: "Home & local services",
    description: "HVAC, plumbing, cleaning, landscaping, and similar trades",
  },
  {
    value: "salon",
    label: "Salon, spa & fitness",
    description: "Appointments, classes, and personal services",
  },
  {
    value: "food",
    label: "Food & retail",
    description: "Restaurants, cafes, shops, and local stores",
  },
  {
    value: "professional",
    label: "Professional services",
    description: "Consultants, lawyers, accountants, coaches",
  },
  {
    value: "other",
    label: "Something else",
    description: "We'll still set you up with a simple lead page",
  },
];

export const GOAL_OPTIONS: {
  value: TenantGoal;
  label: string;
  description: string;
}[] = [
  {
    value: "bookings",
    label: "Get more bookings",
    description: "Customers can request an appointment or call you",
  },
  {
    value: "quotes",
    label: "Get quote requests",
    description: "Short form for name, phone, and what they need",
  },
  {
    value: "email_list",
    label: "Grow my email list",
    description: "Offer a free guide, coupon, or checklist",
  },
  {
    value: "store_visits",
    label: "Drive store visits",
    description: "Send people to your location or hours page",
  },
  {
    value: "followers",
    label: "Grow my audience",
    description: "Start with a simple page people can share",
  },
];

export function goalToTemplate(goal: TenantGoal): LeadPageTemplate {
  switch (goal) {
    case "bookings":
    case "store_visits":
      return "book";
    case "quotes":
      return "quote";
    case "email_list":
    case "followers":
    default:
      return "guide";
  }
}

export function buildLeadPageContent(input: {
  businessName: string;
  offerText: string;
  goal: TenantGoal;
  template: LeadPageTemplate;
}) {
  const ctaByTemplate: Record<LeadPageTemplate, string> = {
    book: "Request a booking",
    quote: "Get a free quote",
    guide: "Get the free guide",
  };

  const subheadByGoal: Record<TenantGoal, string> = {
    bookings: "Tell us what you need and we'll get back to you quickly.",
    quotes: "Share a few details and we'll send your quote.",
    email_list: "Drop your info and we'll send your free resource.",
    store_visits: "See our hours, location, and latest offers.",
    followers: "Stay in touch and see what's new from us.",
  };

  return {
    headline: input.businessName,
    subhead: input.offerText || subheadByGoal[input.goal],
    cta: ctaByTemplate[input.template],
    offer: input.offerText,
  };
}

export type OnboardingFormData = {
  businessName: string;
  businessType: BusinessType;
  goal: TenantGoal;
  offerText: string;
  websiteUrl?: string;
  logoUrl?: string;
  photoUrls: string[];
};

export type AutoReplyPresetSeed = {
  presetKey: string;
  enabled: boolean;
  keywords: string[];
  messageTemplate: string;
};

export function buildAutoReplyPresets(input: {
  businessType: BusinessType;
  businessName: string;
}): AutoReplyPresetSeed[] {
  const business = input.businessName || "our team";

  const byType: Record<
    BusinessType,
    { commentInfo: string; welcomeDm: string }
  > = {
    local_services: {
      commentInfo: "Thanks! Get a free estimate here: {link}",
      welcomeDm: `Hi! ${business} here. Need a quote or service call? Reply with your zip code or visit {link}`,
    },
    salon: {
      commentInfo: "Thanks! Book your appointment: {link}",
      welcomeDm: `Hi! Ready to book? {link} — or tell us what service you're interested in.`,
    },
    food: {
      commentInfo: "Thanks! See our menu/offers: {link}",
      welcomeDm: `Hi! Thanks for reaching out to ${business}. How can we help you today?`,
    },
    professional: {
      commentInfo: "Thanks! Schedule a consultation: {link}",
      welcomeDm: `Hi! Thanks for contacting ${business}. What can we help you with?`,
    },
    other: {
      commentInfo: "Thanks for your interest! Here's how to reach us: {link}",
      welcomeDm: `Hi! Thanks for messaging ${business}. How can we help you today?`,
    },
  };

  const copy = byType[input.businessType];

  return [
    {
      presetKey: "comment_info",
      enabled: true,
      keywords: ["INFO", "PRICE", "QUOTE", "info", "price", "quote"],
      messageTemplate: copy.commentInfo,
    },
    {
      presetKey: "welcome_dm",
      enabled: true,
      keywords: [],
      messageTemplate: copy.welcomeDm,
    },
    {
      presetKey: "comment_link",
      enabled: true,
      keywords: ["LINK", "link"],
      messageTemplate: "Here's the link you asked for: {link}",
    },
  ];
}

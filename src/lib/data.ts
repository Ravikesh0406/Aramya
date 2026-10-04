// ARAMYA — site content & data
// All copy follows Aramya Design System v1.2.

export type Service = {
  slug: string;
  name: string;
  short: string;
  description: string;
  icon: "yoga" | "fitness" | "mobility" | "weight";
  included: string[];
  focus: string[];
};

export const SERVICES: Service[] = [
  {
    slug: "yoga",
    name: "Yoga",
    short: "Private at-home yoga training.",
    description:
      "One-to-one yoga sessions led by a professional trainer in the comfort of your home. Sessions are structured around your goals, your schedule and your experience level — never a generic class replay.",
    icon: "yoga",
    included: [
      "4-session trial",
      "Private at-home sessions",
      "Trainer-led yoga practice",
      "Goal-oriented session structure",
      "Flexible scheduling",
      "Session history",
    ],
    focus: [
      "Breath-led, goal-oriented practice",
      "Posture and alignment guidance",
      "Progressive session plans",
    ],
  },
  {
    slug: "fitness-personal-training",
    name: "Fitness / Personal Training",
    short: "Private at-home fitness and personal training.",
    description:
      "A personal trainer designs and delivers your sessions at home — strength, conditioning and movement quality, progressed session to session and tracked over time.",
    icon: "fitness",
    included: [
      "4-session trial",
      "Private at-home sessions",
      "Goal-based training",
      "Strength and conditioning",
      "Mobility/warm-up work",
      "Exercise progression",
      "Progress tracking",
    ],
    focus: [
      "Goal-based programming",
      "Strength and conditioning",
      "Measured exercise progression",
    ],
  },
  {
    slug: "mobility",
    name: "Mobility",
    short: "Private at-home mobility and movement-focused training.",
    description:
      "Movement-focused sessions that build flexibility, control and range. Your trainer adapts every session to how you move — no equipment-heavy gym setup required.",
    icon: "mobility",
    included: [
      "4-session trial",
      "Private at-home sessions",
      "Mobility-focused training",
      "Flexibility work",
      "Movement-focused exercises",
      "Progress tracking",
      "Flexible scheduling",
    ],
    focus: [
      "Range of motion and control",
      "Flexibility work",
      "Movement quality over time",
    ],
  },
  {
    slug: "weight-management",
    name: "Weight Management / Weight Loss",
    short:
      "Private at-home training focused on weight-management goals, with guidance within professional qualifications.",
    description:
      "Consistent personal training paired with practical lifestyle and nutrition guidance, delivered within your trainer's professional qualifications and focused on sustainable habits.",
    icon: "weight",
    included: [
      "4-session trial",
      "Private at-home sessions",
      "Weight-management focused training",
      "Nutrition/diet guidance within professional qualifications",
      "Practical lifestyle guidance",
      "Progress tracking",
      "Flexible scheduling",
    ],
    focus: [
      "Consistent training routine",
      "Practical lifestyle guidance",
      "Progress you can see and track",
    ],
  },
];

export function getService(slug: string) {
  return SERVICES.find((s) => s.slug === slug);
}

// --- Trial ---------------------------------------------------------------

export const TRIAL = {
  name: "4-Session Trial",
  regularPrice: "₹1,499",
  price: "₹999",
  note: "₹1,499 is the regular displayed price. ₹999 is the early-access price.",
  included: [
    "4 private at-home sessions",
    "Choose preferred days",
    "Morning / afternoon / evening",
    "Flexible schedule changes",
    "Professional trainer-led sessions",
  ],
  cta: "Book Your Trial",
};

// --- Monthly plan ---------------------------------------------------------

export const MONTHLY_PLAN = {
  name: "Monthly Plan",
  price: "₹4,500",
  period: "month",
  included: [
    "16 private at-home sessions",
    "Preferred schedule",
    "Flexible schedule changes",
    "Session tracking",
    "Ongoing progress support",
  ],
  note: "Sessions must be booked 24 hours in advance or more.",
};

// --- How it works ---------------------------------------------------------

export const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Choose your service",
    body: "Yoga, fitness, mobility or weight management.",
  },
  {
    step: "02",
    title: "Tell us your schedule",
    body: "Choose preferred days and time.",
  },
  {
    step: "03",
    title: "We match you",
    body: "Nearby eligible trainers receive the request.",
  },
  {
    step: "04",
    title: "Train at home",
    body: "Your trainer comes to you and sessions are tracked.",
  },
];

// --- Navigation -----------------------------------------------------------

export const NAV_LINKS = [
  { label: "Services", href: "/services" },
  { label: "How it Works", href: "/how-it-works" },
  { label: "Plans", href: "/plans" },
  { label: "For Trainers", href: "/for-trainers" },
];

// --- Search suggestions ---------------------------------------------------

export const SEARCH_SUGGESTIONS = [
  "Yoga",
  "Personal Training",
  "Mobility",
  "Weight Management / Weight Loss",
];

export const LOCATIONS = [
  "Use current location",
  "Search locality",
  "Enter address",
];

// --- Booking time options -------------------------------------------------

export const TIME_OPTIONS = ["Morning", "Afternoon", "Evening", "Specific time"];

export const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// --- Session statuses (Design System §13) ---------------------------------

export const SESSION_STATUSES = [
  "Requested",
  "Accepted",
  "Confirmed",
  "Upcoming",
  "In Progress",
  "Completed",
  "Cancelled",
  "Reschedule Requested",
  "Rescheduled",
  "No Show",
  "Expired",
  "Disputed",
] as const;

export type SessionStatus = (typeof SESSION_STATUSES)[number];


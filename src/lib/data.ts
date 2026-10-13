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

// --- How it works ---------------------------------------------------------

export const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Find a trainer",
    body: "Search by area, specialization, price and availability.",
  },
  {
    step: "02",
    title: "Choose your session",
    body: "Each trainer sets their own duration, format and price.",
  },
  {
    step: "03",
    title: "Send a request",
    body: "Pick the days and start time that suit you.",
  },
  {
    step: "04",
    title: "Train with them",
    body: "The trainer accepts, and you agree payment directly.",
  },
];

// --- Navigation -----------------------------------------------------------

export const NAV_LINKS = [
  { label: "Find a Trainer", href: "/trainers" },
  { label: "How it Works", href: "/how-it-works" },
  { label: "How Pricing Works", href: "/plans" },
  { label: "For Trainers", href: "/for-trainers" },
];

// --- Search suggestions ---------------------------------------------------

export const SEARCH_SUGGESTIONS = [
  "Yoga",
  "Fitness / Personal Training",
  "Mobility",
  "Weight Management",
  "Prenatal & Postnatal Yoga",
  "Meditation & Mindfulness",
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
  "Declined",
  "Reschedule Requested",
  "Rescheduled",
  "No Show",
  "Expired",
  "Disputed",
] as const;

export type SessionStatus = (typeof SESSION_STATUSES)[number];


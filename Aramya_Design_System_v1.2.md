# ARAMYA — Design System v1.2

## 1. Brand Foundation
**Brand:** ARAMYA  
**Website:** aramya.co  
**Positioning:** Managed marketplace for professional fitness and wellness training at home.

**Current active services:** Yoga, Fitness / Personal Training, Mobility, Weight Management / Weight Loss.

**Brand personality:** Premium, Human, Calm, Active, Trustworthy, Modern Indian, Sophisticated.

**Visual direction:** Forest + Ivory + Sand + restrained Terracotta + Manrope + real human photography + generous whitespace + simple interactions.

Avoid traditional spiritual/yoga-only styling, gym-bro aesthetics, clinical/hospital styling, luxury-spa styling, generic SaaS visuals, neon fitness visuals, lotus/Om/chakra/dumbbell/heart-pulse/house+gym clichés.

---

## 2. Color System

| Token | Hex | Usage |
|---|---|---|
| Forest 950 | `#102B24` | Deep backgrounds |
| Forest 900 | `#183C32` | Primary brand, buttons |
| Forest 800 | `#245447` | Hover/secondary |
| Sage 500 | `#8FA58E` | Supporting accent |
| Terracotta 500 | `#B86F52` | Restrained highlight |
| Ivory 50 | `#F7F3EA` | Main background |
| Sand 100 | `#E8DFCF` | Soft surfaces |
| Charcoal 900 | `#242824` | Primary text |
| Muted 600 | `#77766F` | Secondary text |
| White | `#FFFFFF` | Cards |

Semantic: Success `#2F7D5A`, Warning `#B7791F`, Error `#B84A4A`, Info `#4B7085`.

Do not invent new colors without extending the token system.

---

## 3. Typography

Primary font: **Manrope**. Fallback: `Inter, system-ui, sans-serif`.

- Display XL: 56/64, 700–800
- Display: 48/56, 700–800
- H1: 36/44, 700
- H2: 28/36, 700
- H3: 22/28, 700
- H4: 18/24, 700
- Body Large: 18/28, 400
- Body: 16/24, 400
- Body Medium: 16/24, 600
- Body Small: 14/20, 400
- Caption: 12/16, 500
- Overline: 11/16, 800

---

## 4. Spacing, Radius & Shadows

Spacing: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96px`.

Radius:
- XS 4px
- SM 8px
- MD 12px
- LG 16px
- XL 24px
- 2XL 28px
- Pill 999px

Shadows:
- SM `0 4px 15px rgba(16,43,36,0.05)`
- MD `0 10px 30px rgba(16,43,36,0.07)`
- LG `0 16px 45px rgba(16,43,36,0.08)`
- Modal `0 30px 90px rgba(0,0,0,0.18)`

---

## 5. Logo System

The ARAMYA logo is currently being developed.

The final logo must:
- Use ARAMYA brand colors
- Feel premium, modern, human and active
- Work on web, app, social, print and merchandise
- Remain recognizable at small sizes
- Be wordmark-first with an optional independent symbol

Required variants:
1. Primary horizontal `[MARK] ARAMYA`
2. Wordmark `ARAMYA`
3. Symbol-only
4. Light/reversed
5. Dark/primary
6. Monochrome

Explore a custom **A** or subtle movement-inspired mark. It may communicate movement, balance, progression or human energy without becoming a literal fitness icon.

Avoid lotus, Om, chakra, dumbbell, generic person silhouette, heart/pulse, house+gym combinations, complex symbols and generic AI wellness marks.

### Logo color rule
Primary logo colors:
- Forest 900 `#183C32`
- Forest 950 `#102B24`
- Ivory `#F7F3EA`
- Optional restrained Terracotta `#B86F52`

Never invent a separate logo palette.

Never stretch, distort, randomly recolor, add gradients/shadows, or place the logo on insufficient-contrast backgrounds.

---

## 6. Core UI

### Buttons
Primary: Forest 900 + white, 44–48px, 10px radius.  
Secondary: white + Forest border/text.  
Accent: Terracotta, sparingly.  
Ghost: transparent + Forest text.

States: default, hover, pressed, focus, disabled, loading.

### Inputs
48px height, white, subtle 1px border, 10px radius, 12–14px horizontal padding. Focus uses Forest.

Components: text, search, phone, address, number, dropdown, date, time, location, textarea, file upload, checkbox, radio, toggle.

---

## 7. Header

Use a modern marketplace header:

**ARAMYA logo | Select your location | Search yoga, fitness, mobility... | Services | How it Works | Plans | For Trainers | Login | Book a Trial**

Location options:
- Use current location
- Search locality
- Enter address

Search suggestions:
- Yoga
- Personal Training
- Mobility
- Weight Management / Weight Loss

---

## 8. Active Services

### Yoga
Private at-home yoga training.

### Fitness / Personal Training
Private at-home fitness and personal training.

### Mobility
Private at-home mobility and movement-focused training.

### Weight Management / Weight Loss
Private at-home training focused on weight-management goals, with guidance within professional qualifications.

Do not present future-stage categories as active.

---

## 9. Service “What’s Included”

### Yoga
- 4-session trial
- Private at-home sessions
- Trainer-led yoga practice
- Goal-oriented session structure
- Flexible scheduling
- Session history

### Fitness / Personal Training
- 4-session trial
- Private at-home sessions
- Goal-based training
- Strength and conditioning
- Mobility/warm-up work
- Exercise progression
- Progress tracking

### Mobility
- 4-session trial
- Private at-home sessions
- Mobility-focused training
- Flexibility work
- Movement-focused exercises
- Progress tracking
- Flexible scheduling

Avoid medical treatment/cure claims.

### Weight Management / Weight Loss
- 4-session trial
- Private at-home sessions
- Weight-management focused training
- Nutrition/diet guidance within professional qualifications
- Practical lifestyle guidance
- Progress tracking
- Flexible scheduling

Do not imply medical treatment.

---

## 10. Trial Offer

Always call it **4-Session Trial**.

Never call it “4 sessions a week.”

### Pricing
**~~₹1,499~~ ₹999**

₹1,499 = regular displayed price.  
₹999 = early-user / early-access price.

### Trial card
**4-Session Trial**  
~~₹1,499~~ **₹999**

**What’s included**
- 4 private at-home sessions
- Choose preferred days
- Morning / afternoon / evening
- Flexible schedule changes
- Professional trainer-led sessions

CTA: **Book Your Trial**

---

## 11. Booking Flow

Visitor → Location → Service → Service Detail → 4-Session Trial → Preferred Days → Preferred Time → Request → Trainer Matching → Trainer Accepts → Sessions.

Customer chooses four preferred session days, not four sessions every week.

Time options:
- Morning
- Afternoon
- Evening
- Specific time

Sessions must be booked **24 hours in advance or more**.

---

## 12. Trainer Matching

After request:
1. Find nearby eligible trainers.
2. Notify relevant trainers.
3. Trainer accepts.
4. Booking becomes confirmed.
5. Customer receives confirmation.

Prefer the same trainer for the bundle where possible.

---

## 13. Session & Scheduling Rules

Statuses:
Requested, Accepted, Confirmed, Upcoming, In Progress, Completed, Cancelled, Reschedule Requested, Rescheduled, No Show, Expired, Disputed.

**Do not use OTP for session completion.**

Completion:
- Trainer marks completed
- Customer can confirm
- Customer can report an issue
- Session history is recorded
- Disagreements can become Disputed for admin review

Schedule changes:
- Both customer and trainer can request changes.
- A confirmed session must never silently change.
- `Confirmed → Reschedule Requested → Other Party Accepts → Rescheduled`

---

# 14. MONTHLY SUBSCRIPTION — IMPORTANT UPDATED RULE

## Current displayed price
### **₹4,500 / month**

Do **not** display ₹6,000 as the current customer-facing monthly price.

## Critical design rule
**Do NOT make “16 sessions” the main headline, the large bold pricing metric, or the dominant visual element.**

The monthly subscription and **₹4,500/month** should be the primary pricing message.

Use:

**Monthly Plan**  
### **₹4,500 / month**

**What’s included**
- 16 private at-home sessions
- Preferred schedule
- Flexible schedule changes
- Session tracking
- Ongoing progress support

The “16 private at-home sessions” line is simply **one inclusion point**.

Do NOT show:
- “16 sessions” as the main large pricing headline
- “16 sessions minimum” as a prominent restriction
- ₹6,000 as the current price

---

## 15. V2 Add Sessions

Future V2 feature:

**Add Sessions +**
- +1
- +2
- +4

Exact pricing TBD.

This should feel like an extension of the monthly plan, not another subscription.

Do not activate it in V1.

---

## 16. Homepage

Recommended structure:
1. Header
2. Hero
3. Location/search
4. Services
5. 4-Session Trial
6. How ARAMYA Works
7. Why train at home
8. Trainer trust
9. Monthly Plan
10. CTA
11. Footer

Hero:
**Fitness & wellness, at home.**

Primary CTA: **Book a Trial**  
Secondary CTA: **Explore Services**

---

## 17. How ARAMYA Works

01 — Choose your service  
Yoga, fitness, mobility or weight management.

02 — Tell us your schedule  
Choose preferred days and time.

03 — We match you  
Nearby eligible trainers receive the request.

04 — Train at home  
Your trainer comes to you and sessions are tracked.

---

## 18. Navigation

### Customer
Home, Services, My Sessions, Schedule, Plan, Profile

### Trainer
Dashboard, Nearby Requests, Schedule, Sessions, Availability, Earnings, Profile

### Admin
Customers, Trainers, Requests, Sessions, Payments, Schedule Changes, Disputes, Cancellations, No-shows, Service Configuration

---

## 19. Iconography

Use one consistent rounded-outline icon family.

Search, Location, Calendar, Clock, Home, User, Trainer, Yoga, Fitness, Mobility, Weight, Notification, Check, Close, Arrow, Chevron, Edit, Plus, Minus, Phone, Payment, Star, Alert, Settings, Menu.

Never mix icon styles.

---

## 20. Photography

Use real Indian/NCR homes, real trainers/customers, natural daylight and warm documentary photography.

Avoid fake stock, extremely muscular models, luxury spa imagery, generic meditation stock, neon gyms and unrealistic interiors.

---

## 21. Motion

180–220ms, ease-out, subtle hover and modal transitions.

Avoid bouncy, gamified or distracting animation.

---

## 22. Accessibility

Target WCAG AA:
- 44×44px minimum touch targets
- Visible keyboard focus
- Strong contrast
- Clear labels/errors
- Keyboard navigation
- Never rely on color alone
- Respect reduced-motion preferences

---

## 23. Responsive Layout

Mobile: 320–767px  
Tablet: 768–1023px  
Desktop: 1024–1439px  
Large desktop: 1440px+

Maximum content width: 1200–1280px.

Desktop section spacing: 64–96px.  
Mobile section spacing: 40–64px.

---

## 24. Core Components

Header, Location Selector, Search Bar, Button, Input, Dropdown, Service Card, Trainer Card, Trial Card, Plan Card, Session Card, Request Card, Status Badge, Day Selector, Time Selector, Availability Calendar, Schedule Timeline, Payment Summary, Modal, Toast, Notification, Empty State, Loading State, Error State.

---

## 25. Figma Structure

### 01 Brand Foundation
Logo, Logo Variants, Brand Colors, Typography, Photography

### 02 Foundations
Color Variables, Typography Variables, Spacing, Radius, Shadows, Grid

### 03 Components
Buttons, Inputs, Search, Location, Cards, Badges, Tabs, Navigation, Modal, Toast, Calendar, Time Picker, Day Selector, Session Card, Trainer Card, Trial Card, Plan Card

### 04 Customer
Homepage, Services, Service Detail, Booking, Trial, Dashboard, Sessions, Schedule, Plan, Profile

### 05 Trainer
Dashboard, Nearby Requests, Availability, Schedule, Sessions, Earnings, Profile

### 06 Admin
Dashboard, Customers, Trainers, Requests, Sessions, Payments, Disputes

### 07 Prototype
Visitor Flow, Customer Booking Flow, Trainer Acceptance Flow, Reschedule Flow, Trial → Monthly Plan Flow

---

## 26. CSS Tokens

```css
:root {
  --forest-950: #102B24;
  --forest-900: #183C32;
  --forest-800: #245447;
  --sage-500: #8FA58E;
  --terracotta-500: #B86F52;
  --ivory-50: #F7F3EA;
  --sand-100: #E8DFCF;
  --charcoal-900: #242824;
  --muted-600: #77766F;
  --white: #FFFFFF;

  --success: #2F7D5A;
  --warning: #B7791F;
  --error: #B84A4A;
  --info: #4B7085;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-2xl: 28px;
  --radius-pill: 999px;

  --shadow-sm: 0 4px 15px rgba(16,43,36,0.05);
  --shadow-md: 0 10px 30px rgba(16,43,36,0.07);
  --shadow-lg: 0 16px 45px rgba(16,43,36,0.08);
  --shadow-modal: 0 30px 90px rgba(0,0,0,0.18);
}
```

---

## 27. AI Agent Rules

1. Keep ARAMYA focused on home training.
2. Use only the four active services.
3. Always use “4-Session Trial”.
4. Never say “4 sessions a week”.
5. Trial price: **~~₹1,499~~ ₹999**.
6. Monthly price: **₹4,500/month**.
7. Do not show ₹6,000 as the current monthly price.
8. Do not make “16 sessions” the dominant monthly pricing message.
9. Show “16 private at-home sessions” as one inclusion point under What’s Included.
10. V2 Add Sessions is not active in V1.
11. Sessions require 24+ hours advance booking.
12. Do not use OTP for completion.
13. Confirmed schedule changes require the other party’s acceptance.
14. Prefer the same trainer for a bundle where possible.
15. Use the defined session statuses.
16. Use approved ARAMYA colors.
17. Logo must use the ARAMYA brand palette.
18. Never distort or randomly recolor the logo.
19. Use warm, real human photography.
20. Maintain WCAG AA.
21. Prioritize clarity over decorative UI.

---

# Final Visual Target

ARAMYA should feel like:

**A premium, modern Indian at-home fitness marketplace combining the operational clarity of a managed service with the warmth of a human wellness brand.**

The user should immediately understand:

**What ARAMYA is → what services are available → what the trial costs → how matching works → how to book → what the monthly plan costs.**

The visual hierarchy must make **₹4,500/month** the primary monthly pricing message, while **16 private at-home sessions** remains a supporting inclusion.

---

# v1.3 NOTE — Marketplace positioning (Round 3)

ARAMYA is now a **trainer marketplace**, not a fixed-price managed service. The rules
below supersede the pricing and matching sections of v1.2 where they conflict.

## Positioning

- Customers **choose a trainer**, then an offering, then days and a start time. Aramya
  does not match customers to trainers silently.
- Every trainer sets their own price. Aramya enforces only sanity bounds (admin
  configured, per 60 minutes) and never sets or displays a global price.
- Trainers publish availability as time ranges per weekday (IST, 15-minute steps).
  Customers book inside those ranges.
- Payment for sessions is arranged **directly** between customer and trainer. Nothing is
  added on top of the trainer's price.
- Trainer listing is free unless the listing fee is enabled; then an admin-created plan
  applies. No fee amount is ever hardcoded in the UI.

## Session statuses (updated §13)

Requested, Accepted, Confirmed, Upcoming, In Progress, Completed, Cancelled,
**Declined**, Reschedule Requested, Rescheduled, No Show, Expired, Disputed.

- `Declined` is a terminal state for a targeted request the trainer answered "no".
- A targeted request becomes `Expired` after 24 hours without an answer.
- A booking is `Confirmed` only after the trainer accepts.
- Targeted requests are visible only to the targeted trainer, not to other trainers.

## Components

- `TrainerMarketCard` replaces generic trainer cards in discovery: photo (initials on a
  Sand surface when none — never stock photography), name, primary specialization, years
  of experience, locality, formats (In person / Online (Zoom)), "from ₹X per Y-min
  session" derived from real offerings, `Verified` badge only for verified trainers,
  rating with its count only when reviews exist.
- `TrialCard` and `PlanCard` are removed: there is no trial and no monthly plan.
- Ratings are always shown with their review count; never show stars for zero reviews.

## Privacy rules

- Never public: trainer exact coordinates, street address, contact, meeting links,
  certification documents, verification notes.
- Public trainer pages show city/locality and a coarse distance ("about 3 km") computed
  server-side.

## Removed / deprecated copy

- "Book a Trial", "4-Session Trial", "Monthly Plan", "₹4,500/month", "We match you",
  "Managed marketplace" and every fixed price are removed from production paths.
- The primary CTA is **"Find a trainer"** (`/trainers`).

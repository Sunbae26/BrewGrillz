// Wording for /privacy and /terms. Change the text here and update LEGAL_UPDATED.
// A careful starting draft based on how the website works: the client (or their lawyer) must confirm it before launch.
export const LEGAL_UPDATED = "17 November 2026";

export const privacy = {
  title: "Privacy policy",
  intro:
    "This policy explains what personal data BrewGrillz collects through this website, why, and how we look after it, in line with Singapore’s Personal Data Protection Act 2012 (PDPA).",
  sections: [
    {
      heading: "Who we are",
      body: ["BrewGrillz, 163 Rochor Road, Bugis Street, Singapore 188438. You can reach our Data Protection Officer at info@brewgrillz.sg or +65 6312 2847."],
    },
    {
      heading: "What we collect",
      list: [
        "Pickup orders: your name, mobile number, email, what you ordered, your pickup time and any notes.",
        "Table bookings: your name, mobile number, email, party size, date and time, and any notes or occasion.",
        "Event enquiries: your contact details and the details of your event.",
        "Newsletter: your email address, if you sign up.",
        "Payments are handled by Stripe. We never see or store your full card number.",
        "Basic technical data (like your browser and the pages you visit) to keep the site secure and working.",
      ],
    },
    {
      heading: "Why we use it",
      list: [
        "To prepare your order, hold your table or plan your event, and to contact you about it.",
        "To send receipts and updates by email, and by WhatsApp if you ask us to.",
        "To send our newsletter, only if you signed up. Every email has a way to unsubscribe.",
        "To prevent fraud and misuse, and to meet our legal and accounting duties.",
      ],
    },
    {
      heading: "Who we share it with",
      body: [
        "Only the companies that help us run the service, and only what they need: Stripe (payments), Resend (emails), Meta (WhatsApp messages, if you opt in), Vercel and Render (website hosting) and Neon (our database). We don’t sell your data, and we don’t share it for anyone else’s marketing.",
      ],
    },
    {
      heading: "How long we keep it",
      body: [
        "Order and payment records are kept for as long as Singapore accounting rules require (usually 5 years). Booking and enquiry details are kept for up to 2 years. Newsletter emails are kept until you unsubscribe.",
      ],
    },
    {
      heading: "Your rights",
      body: [
        "You can ask to see the personal data we hold about you, correct it, or withdraw your consent for us to use it. Email info@brewgrillz.sg and we’ll reply within 30 days. Withdrawing consent may mean we can’t complete an order or booking.",
      ],
    },
    {
      heading: "Cookies and storage",
      body: [
        "We use your browser’s storage to remember your cart, your recent orders and bookings, and the details you typed last time, so you don’t have to type them again. This stays on your device. We don’t use advertising cookies.",
      ],
    },
  ],
};

export const terms = {
  title: "Terms of use",
  intro: "By using this website, ordering for pickup, booking a table or sending an event enquiry, you agree to these terms.",
  sections: [
    {
      heading: "Pickup orders",
      list: [
        "Online orders are for pickup at 163 Rochor Road only. For delivery, order through GrabFood or foodpanda.",
        "Prices are in Singapore dollars and include GST. The 10% service charge applies to dine-in only.",
        "Orders are confirmed once payment is complete. You’ll get an email with your order number.",
        "Alcohol can’t be ordered online. It’s served at the restaurant only, to guests aged 18 and over.",
        "Please collect your order at the time you chose. Food is prepared fresh for that time.",
      ],
    },
    {
      heading: "Cancellations and refunds (pickup orders)",
      list: [
        "To cancel, call us on +65 6312 2847 as soon as possible with your order number.",
        "Cancelled before we start preparing it: full refund to your original payment method.",
        "Once cooking has started, we usually can’t refund the order.",
        "Orders not collected on the day can’t be refunded.",
        "Something wrong with your order? Tell us the same day and we’ll put it right.",
        "Refunds usually take 5 to 10 working days to reach your account.",
      ],
    },
    {
      heading: "Table bookings",
      list: [
        "Online bookings are for up to 10 guests. Larger groups, please send an event enquiry.",
        "Your booking is a request until we confirm it by email.",
        "We hold your table for 15 minutes after your booking time. Running late? Call us.",
        "Tables are usually reserved for 2 hours.",
        "Can’t make it? Cancel from your booking page or call us, so someone else can have the table.",
      ],
    },
    {
      heading: "Events and parties",
      list: [
        "An enquiry is not a booking. We’ll send a quote with the menu, price, any deposit and the cancellation terms.",
        "Your event is confirmed only when you accept the quote and pay any deposit it asks for.",
      ],
    },
    {
      heading: "Allergies",
      body: [
        "Dietary tags on the menu are a guide only. Our kitchen handles common allergens, so we can’t guarantee any dish is free of them. Please tell us about allergies before ordering.",
      ],
    },
    {
      heading: "The website",
      body: [
        "We work hard to keep menu details, prices and photos accurate, but mistakes can happen; photos are for illustration. We may change these terms; the date at the top shows the latest version. These terms are governed by the laws of Singapore.",
      ],
    },
  ],
};

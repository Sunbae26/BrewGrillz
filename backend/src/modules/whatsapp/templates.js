// Create these in Meta Business Manager (WhatsApp Manager → Message templates), category Utility,
// language English, with exactly this wording. {{n}} are the variables, filled in order.
export const TEMPLATES = {
  bgz_order_placed: {
    params: 5,
    body: "Hi {{1}}, thanks for your BrewGrillz order {{2}}. Pickup: {{3}}. Total: {{4}}. Track it here: {{5}} See you at 163 Rochor Road!",
  },
  bgz_order_preparing: {
    params: 3,
    body: "Hi {{1}}, your BrewGrillz order {{2}} is on the grill. Track it here: {{3}} We'll message you again when it's ready.",
  },
  bgz_order_ready: {
    params: 3,
    body: "Hi {{1}}, your BrewGrillz order {{2}} is ready for pickup at 163 Rochor Road, Bugis. Track it here: {{3}} See you soon!",
  },
  bgz_order_cancelled: {
    params: 4,
    body: "Hi {{1}}, your BrewGrillz order {{2}} has been cancelled. {{3}} Questions? Call us on {{4}}.",
  },
  bgz_booking_received: {
    params: 5,
    body: "Hi {{1}}, we've received your BrewGrillz table request {{2}} for {{3}}, {{4}} guests. We'll confirm it shortly. Details: {{5}}",
  },
  bgz_booking_confirmed: {
    params: 5,
    body: "Hi {{1}}, your BrewGrillz table booking {{2}} is confirmed for {{3}}, {{4}} guests. Details: {{5}} See you at 163 Rochor Road!",
  },
  bgz_booking_declined: {
    params: 4,
    body: "Hi {{1}}, sorry, we couldn't confirm your BrewGrillz table request {{2}} for {{3}}. Please choose another time, or call us on {{4}}.",
  },
  bgz_booking_cancelled: {
    params: 4,
    body: "Hi {{1}}, your BrewGrillz table booking {{2}} for {{3}} has been cancelled. Questions? Call us on {{4}}.",
  },
};

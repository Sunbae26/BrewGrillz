import { site } from "../config/site.js";

// Search and sharing tags for every page: title, description, canonical link, Open Graph and X cards.
export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? "https://www.brewgrillz.sg").replace(/\/$/, "");
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;

export function seo({ title, description, path = "/", image = DEFAULT_IMAGE, noIndex = false, schema }) {
  const url = `${SITE_URL}${path === "/" ? "/" : path}`;
  return [
    { title },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: url },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "BrewGrillz Singapore" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:image", content: image },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:locale", content: "en_SG" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
    ...(noIndex ? [{ name: "robots", content: "noindex, follow" }] : []),
    ...(schema ? [{ "script:ld+json": schema }] : []),
  ];
}

// The restaurant itself, for Google (opening hours, address, menu, ordering and booking links).
export const restaurantSchema = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "@id": `${SITE_URL}/#restaurant`,
  name: "BrewGrillz",
  alternateName: "BrewGrillz Singapore",
  description: "Grill and craft bar in Bugis: flame-grilled steaks, BBQ ribs, sharing platters, Italian pizza and pasta, Brewerkz craft beer and cocktails.",
  url: `${SITE_URL}/`,
  image: [DEFAULT_IMAGE],
  logo: `${SITE_URL}/brand/logo-badge.png`,
  telephone: site.phone,
  email: site.email,
  priceRange: "$$",
  servesCuisine: ["Western", "Steakhouse", "Grill", "Italian", "Pizza", "Bar"],
  address: {
    "@type": "PostalAddress",
    streetAddress: "163 Rochor Road",
    addressLocality: "Singapore",
    postalCode: "188438",
    addressCountry: "SG",
  },
  geo: { "@type": "GeoCoordinates", latitude: 1.3009, longitude: 103.8553 },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "10:00",
      closes: "23:00",
    },
  ],
  hasMenu: `${SITE_URL}/menu`,
  acceptsReservations: true,
  potentialAction: [
    { "@type": "OrderAction", target: `${SITE_URL}/menu`, deliveryMethod: "http://purl.org/goodrelations/v1#DeliveryModePickUp" },
    { "@type": "ReserveAction", target: `${SITE_URL}/reserve` },
  ],
  sameAs: Object.values(site.socials),
};

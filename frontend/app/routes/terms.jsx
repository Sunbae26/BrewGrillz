import LegalPage from "../components/ui/LegalPage";
import { terms } from "../config/legal";
import { seo } from "../lib/seo.js";

export const meta = () =>
  seo({
    title: "Terms, Refunds & Bookings | BrewGrillz Singapore",
    description: "Terms for BrewGrillz pickup orders, refunds and cancellations, table bookings and events.",
    path: "/terms",
  });

export default function Terms() {
  return <LegalPage doc={terms} eyebrow="The small print" />;
}

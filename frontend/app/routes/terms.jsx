import LegalPage from "../components/ui/LegalPage";
import { terms } from "../config/legal";

export const meta = () => [
  { title: "Terms, Refunds & Bookings | BrewGrillz Singapore" },
  { name: "description", content: "Terms for BrewGrillz pickup orders, refunds and cancellations, table bookings and events." },
];

export default function Terms() {
  return <LegalPage doc={terms} eyebrow="The small print" />;
}
